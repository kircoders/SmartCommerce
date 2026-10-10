// Phase 5

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartEntity } from '../cart/entities/cart.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { ShipmentEntity } from '../shipments/entities/shipment.entity';
import { ShipmentsModule } from '../shipments/shipments.module';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderEntity } from './entities/order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  // CartEntity, InventoryEntity, and now ShipmentEntity are registered here
  // too (not just OrderEntity/OrderItemEntity) - OrdersService reads/writes
  // them directly through its transaction manager, deliberately not going
  // through CartModule/InventoryModule's own services (see orders.service.ts
  // for why). ShipmentsModule is imported separately, for OrdersController
  // to reuse ShipmentsService's customer-scoped lookup rather than
  // duplicating that query here.
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      CartEntity,
      InventoryEntity,
      ShipmentEntity,
    ]),
    ShipmentsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
