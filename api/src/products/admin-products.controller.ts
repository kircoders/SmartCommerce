// Phase 2

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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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

// Admin-only routes for managing the catalog (create/update/delete products
// and their images). Contrast with products.controller.ts, which exposes
// read-only routes any logged-in user can hit.
//
// Both guards run on every route in this class, in order, before any
// handler code executes:
//   1. JwtAuthGuard - must be logged in with a valid JWT at all.
//   2. RolesGuard + @Roles(UserRole.ADMIN) - and that user's role must be
//      ADMIN specifically. Non-admins get rejected here, never reaching
//      the database.
@ApiTags('admin-products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/products')
export class AdminProductsController {
  // NestJS injects the service - all the actual DB/S3 logic lives there.
  // This controller stays "thin": parse the request, call the service,
  // shape the response.
  constructor(private readonly productsService: ProductsService) {}

  // POST /admin/products
  // Creates a new product. `dto` is auto-validated against CreateProductDto
  // (class-validator) before this method ever runs - if validation fails,
  // NestJS returns a 400 automatically.
  // @CurrentUser() pulls the logged-in user off the request (attached by
  // JwtAuthGuard) so we know who to credit as the creator.
  @Post()
  @ApiOperation({ summary: 'Create a new product (admin only)' })
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: ProductEntity }> {
    const data = await this.productsService.create(dto, user.id);
    return { data };
  }

  // PUT /admin/products/:id
  // Partial update - UpdateProductDto makes every field optional, so you
  // only need to send the fields you're changing.
  @Put(':id')
  @ApiOperation({ summary: 'Update a product (admin only, partial update)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<{ data: ProductEntity }> {
    const data = await this.productsService.update(id, dto);
    return { data };
  }

  // DELETE /admin/products/:id
  // Deletes the product AND all of its S3 images (handled inside the
  // service, not here) - this route just triggers it.
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product, its images, inventory, and any cart items referencing it (admin only)' })
  async remove(@Param('id') id: string): Promise<{ data: null; message: string }> {
    await this.productsService.remove(id);
    return { data: null, message: 'Product deleted' };
  }

  // POST /admin/products/:id/images
  // Uploads one image for a product. FileInterceptor('file') tells NestJS
  // to expect a multipart/form-data request with a field named "file", and
  // hands the raw bytes to this handler as `file.buffer`.
  // ?primary=true marks this as the product's main/cover image - note the
  // query param arrives as a string ("true"/"false"), hence the explicit
  // comparison rather than treating it as a boolean directly.
  @Post(':id/images')
  @ApiOperation({ summary: 'Upload a product image (admin only, multipart/form-data)' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string },
    @Query('primary') primary: string,
  ): Promise<{ data: ProductImageEntity }> {
    const data = await this.productsService.uploadImage(id, file, primary === 'true');
    return { data };
  }

  // DELETE /admin/products/:id/images/:imageId
  // Deletes one specific image off a product (both the S3 object and its
  // DB row - handled in the service).
  @Delete(':id/images/:imageId')
  @ApiOperation({ summary: 'Delete a product image (admin only)' })
  async deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ): Promise<{ data: null; message: string }> {
    await this.productsService.deleteImage(id, imageId);
    return { data: null, message: 'Image deleted' };
  }
}
