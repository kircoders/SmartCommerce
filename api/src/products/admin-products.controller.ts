import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductImageEntity } from './entities/product-image.entity';
import { ProductEntity } from './entities/product.entity';
import { ProductsService } from './products.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: ProductEntity }> {
    const data = await this.productsService.create(dto, user.id);
    return { data };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<{ data: ProductEntity }> {
    const data = await this.productsService.update(id, dto);
    return { data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ data: null; message: string }> {
    await this.productsService.remove(id);
    return { data: null, message: 'Product deleted' };
  }

  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string },
    @Query('primary') primary: string,
  ): Promise<{ data: ProductImageEntity }> {
    const data = await this.productsService.uploadImage(id, file, primary === 'true');
    return { data };
  }

  @Delete(':id/images/:imageId')
  async deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ): Promise<{ data: null; message: string }> {
    await this.productsService.deleteImage(id, imageId);
    return { data: null, message: 'Image deleted' };
  }
}
