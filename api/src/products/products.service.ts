import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { ILike, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductImageEntity } from './entities/product-image.entity';
import { ProductEntity } from './entities/product.entity';

const BUCKET = 'smartcommerce-product-images-452698428461';
const REGION = 'us-east-1';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly s3 = new S3Client({ region: REGION });

  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(ProductImageEntity)
    private readonly imageRepo: Repository<ProductImageEntity>,
  ) {}

  async findAll(): Promise<ProductEntity[]> {
    return this.productRepo.find({
      where: { isActive: true },
      relations: { images: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<ProductEntity> {
    const product = await this.productRepo.findOne({
      where: { id, isActive: true },
      relations: { images: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async search(q: string): Promise<ProductEntity[]> {
    return this.productRepo.find({
      where: [
        { name: ILike(`%${q}%`), isActive: true },
        { description: ILike(`%${q}%`), isActive: true },
      ],
      relations: { images: true },
      order: { name: 'ASC' },
    });
  }

  async create(dto: CreateProductDto, userId: string): Promise<ProductEntity> {
    const product = this.productRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      price: dto.price,
      isActive: dto.isActive ?? true,
      createdBy: userId,
    });
    return this.productRepo.save(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductEntity> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: { images: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    for (const image of product.images) {
      await this.deleteFromS3(image.s3Key);
    }
    await this.productRepo.remove(product);
  }

  async uploadImage(
    productId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    isPrimary: boolean,
  ): Promise<ProductImageEntity> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const s3Key = `products/${productId}/${randomUUID()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${s3Key}`;

    if (isPrimary) {
      await this.imageRepo.update({ productId }, { isPrimary: false });
    }

    const image = this.imageRepo.create({ productId, url, s3Key, isPrimary });
    return this.imageRepo.save(image);
  }

  async deleteImage(productId: string, imageId: string): Promise<void> {
    const image = await this.imageRepo.findOne({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('Image not found');
    await this.deleteFromS3(image.s3Key);
    await this.imageRepo.remove(image);
  }

  private async deleteFromS3(s3Key: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key }));
    } catch (err) {
      this.logger.error(`Failed to delete S3 object ${s3Key}`, err);
    }
  }
}
