// Phase 2

import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminProductsController } from './admin-products.controller';
import { CartModule } from '../cart/cart.module';
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
  //
  // CartModule is wrapped in forwardRef() because it's a genuine circular
  // dependency: CartModule imports ProductsModule too (CartService needs
  // ProductsService to look up products), and ProductsService now needs
  // CartService to clean up cart_items before a product is deleted. See
  // cart.module.ts for the matching forwardRef on the other side.
  imports: [
    TypeOrmModule.forFeature([ProductEntity, ProductImageEntity]),
    InventoryModule,
    forwardRef(() => CartModule),
  ],
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService],
  // Phase 4: CartService needs ProductsService (to fetch a product's
  // current price/existence when adding to a cart) - exported so
  // CartModule can import this module and inject it.
  exports: [ProductsService],
})
export class ProductsModule {}
