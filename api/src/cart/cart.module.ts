// Phase 4

import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductsModule } from '../products/products.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CheckoutController } from './checkout.controller';
import { CartItemEntity } from './entities/cart-item.entity';
import { CartEntity } from './entities/cart.entity';

@Module({
  // ProductsModule and InventoryModule both export their services (see
  // each module's own file) so CartService can inject ProductsService
  // (fetch a product when adding to cart) and InventoryService (check
  // stock on every add/update, and on checkout validation).
  //
  // ProductsModule is wrapped in forwardRef() - genuine circular
  // dependency, see products.module.ts for the matching forwardRef on the
  // other side (ProductsService now needs CartService too, to clean up
  // cart_items before a product is deleted).
  imports: [
    TypeOrmModule.forFeature([CartEntity, CartItemEntity]),
    forwardRef(() => ProductsModule),
    InventoryModule,
  ],
  controllers: [CartController, CheckoutController],
  providers: [CartService],
  // Phase 4: ProductsService needs CartService (to clean up cart_items
  // before deleting a product) - exported so ProductsModule can import
  // this module and inject it.
  exports: [CartService],
})
export class CartModule {}
