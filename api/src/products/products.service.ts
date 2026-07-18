// Phase 2

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
import { InventoryService } from '../inventory/inventory.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductImageEntity } from './entities/product-image.entity';
import { ProductEntity } from './entities/product.entity';

const BUCKET = 'smartcommerce-product-images-452698428461';
const REGION = 'us-east-1';

// The shape the public read methods actually return - a product plus
// derived stock info. Not real database columns; computed fresh on every
// read from the inventory table via InventoryService. quantityAvailable
// and lowStockThreshold are deliberately exposed here (unlike reserved
// quantity or adjustment history, which stay internal-only) so the
// frontend can show "only N left!" urgency messaging on the catalog.
export type ProductWithStock = ProductEntity & {
  inStock: boolean;
  quantityAvailable: number;
  lowStockThreshold: number;
};

// All the actual business logic for the products module lives here - both
// controllers (products.controller.ts, admin-products.controller.ts) just
// parse the request and delegate to a method on this class. This is where
// DTOs (already-validated request data) get turned into entities (real
// database rows), and where TypeORM and the S3 SDK get called side by side.
@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly s3 = new S3Client({ region: REGION });

  // @InjectRepository gives this class a TypeORM Repository scoped to each
  // entity - the actual object with .find()/.save()/.remove() on it,
  // pre-wired to the right table. NestJS constructs this class and injects
  // these automatically; nothing ever does `new ProductsService(...)`.
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(ProductImageEntity)
    private readonly imageRepo: Repository<ProductImageEntity>,
    private readonly inventoryService: InventoryService,
  ) {}

  // All three read methods below share the same shape: filter to
  // isActive: true (the soft-delete flag - inactive products never show up
  // here), eager-load relations: { images: true } so each product comes
  // back with its images already joined in, and attach inStock (Phase 3)
  // via a separate batch lookup against the inventory table.

  async findAll(): Promise<ProductWithStock[]> {
    const products = await this.productRepo.find({
      where: { isActive: true },
      relations: { images: true },
      order: { name: 'ASC' },
    });
    return this.attachStock(products);
  }

  async findOne(id: string): Promise<ProductWithStock> {
    const product = await this.productRepo.findOne({
      where: { id, isActive: true },
      relations: { images: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    const [withStock] = await this.attachStock([product]);
    return withStock;
  }

  // ILike = case-insensitive LIKE. An array passed to `where` means OR in
  // TypeORM, so this reads as "name matches the search term OR description
  // matches" - not AND. Wildcards on both sides ('%q%') mean this can't
  // fully use the idx_products_name index from the migration; fine at this
  // table's current size, would need a different index type (e.g. pg_trgm)
  // to stay fast at a much larger scale.
  async search(q: string): Promise<ProductWithStock[]> {
    const products = await this.productRepo.find({
      where: [
        { name: ILike(`%${q}%`), isActive: true },
        { description: ILike(`%${q}%`), isActive: true },
      ],
      relations: { images: true },
      order: { name: 'ASC' },
    });
    return this.attachStock(products);
  }

  // Batch-fetches stock info for a list of products in one query (via
  // InventoryService.getStockInfoMap) rather than one inventory lookup
  // per product - avoids an N+1 query pattern when findAll() returns many
  // products at once.
  private async attachStock(products: ProductEntity[]): Promise<ProductWithStock[]> {
    const stockInfo = await this.inventoryService.getStockInfoMap(products.map((p) => p.id));
    return products.map((p) => {
      const info = stockInfo[p.id] ?? { quantityAvailable: 0, lowStockThreshold: 0 };
      return {
        ...p,
        inStock: info.quantityAvailable > 0,
        quantityAvailable: info.quantityAvailable,
        lowStockThreshold: info.lowStockThreshold,
      };
    });
  }

  // dto arrives here already validated by CreateProductDto's decorators
  // (enforced by the global ValidationPipe before this method ever runs).
  // userId comes from the controller's @CurrentUser() - the authenticated
  // caller, not anything the client can claim in the request body - so a
  // user can never set createdBy to someone else's id.
  async create(dto: CreateProductDto, userId: string): Promise<ProductEntity> {
    const product = this.productRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      price: dto.price,
      isActive: dto.isActive ?? true,
      createdBy: userId,
    });
    // Every product needs exactly one inventory row (Phase 3) - a
    // database trigger (see migration InventoryAutoCreateTrigger) creates
    // it automatically the instant this INSERT happens, so there's
    // nothing to call here explicitly anymore. This is a stronger
    // guarantee than application code calling InventoryService after the
    // fact - it holds even for a product inserted outside this method
    // entirely (raw SQL, a script, a future code path).
    return this.productRepo.save(product);
  }

  // Object.assign only overwrites properties that actually exist on dto -
  // this is what makes a *partial* update work correctly. Since
  // UpdateProductDto makes every field optional, sending just { price: 24.99 }
  // leaves name/description/isActive untouched on the existing entity.
  // TypeORM generates an UPDATE (not an INSERT) here because `product`
  // already has an id from the findOne() above.
  async update(id: string, dto: UpdateProductDto): Promise<ProductEntity> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  // Deleting a product has to clean up three things: S3 files, the
  // inventory record, and the product row itself - in that order.
  // Postgres can't reach into S3 on its own, so every image's actual file
  // gets deleted manually here first. The image *rows* don't need manual
  // deletion though - product_images.product_id has ON DELETE CASCADE (see
  // the migration), so productRepo.remove() triggers Postgres to delete
  // them automatically. inventory.product_id has NO cascade, though - it
  // has to be deleted explicitly before the product row, or Postgres
  // rejects the delete with a foreign key violation.
  async remove(id: string): Promise<void> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: { images: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    for (const image of product.images) {
      await this.deleteFromS3(image.s3Key);
    }
    await this.inventoryService.deleteForProduct(id);
    await this.productRepo.remove(product);
  }

  async uploadImage(
    productId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    isPrimary: boolean,
  ): Promise<ProductImageEntity> {
    // Verify-then-act: confirm the product actually exists before touching
    // S3 at all, so a bad productId never orphans a file with nothing to
    // attach it to.
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    // Random UUID filename (not the original filename) so two uploads can
    // never collide, even if both are literally named "photo.jpg".
    // Namespaced under products/{productId}/ so one product's images sit
    // together in the bucket.
    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const s3Key = `products/${productId}/${randomUUID()}.${ext}`;

    // The actual network call to S3 - uploads the raw file bytes.
    await this.s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${s3Key}`;

    // "Only one image can be primary" isn't a database constraint - it's
    // enforced here, procedurally: a bulk UPDATE (no findOne/save
    // round-trip) flips every existing image on this product to
    // isPrimary: false, run BEFORE inserting the new one as primary.
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

  // private = only callable from within this class, shared by remove() and
  // deleteImage(). The try/catch here is a deliberate exception to letting
  // errors propagate elsewhere in this file: if S3 fails to delete, we log
  // it and move on rather than blocking the whole product/image deletion.
  // Tradeoff being accepted: a rare orphaned S3 file is preferable to a
  // delete operation that can never complete because S3 had a bad moment.
  private async deleteFromS3(s3Key: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key }));
    } catch (err) {
      this.logger.error(`Failed to delete S3 object ${s3Key}`, err);
    }
  }
}
