// Phase 2

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminProductsController } from './admin-products.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductImageEntity } from './entities/product-image.entity';
import { ProductEntity } from './entities/product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  // InventoryModule exports InventoryService (see inventory.module.ts) so
  // ProductsService can inject it - needed to auto-create an inventory row
  // when a product is created, and to clean inventory up before a product
  // is deleted (see products.service.ts).
  imports: [TypeOrmModule.forFeature([ProductEntity, ProductImageEntity]), InventoryModule],
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
