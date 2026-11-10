// Phase 10

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncidentEntity } from '../incidents/entities/incident.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { RefundEntity } from '../returns/entities/refund.entity';
import { ReturnEntity } from '../returns/entities/return.entity';
import { ShipmentEntity } from '../shipments/entities/shipment.entity';
import { SupportTicketEntity } from '../support/entities/support-ticket.entity';
import { UserEntity } from '../users/entities/user.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

// No tables of its own - it only reads the ones every earlier phase built.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      ProductEntity,
      InventoryEntity,
      OrderEntity,
      ShipmentEntity,
      SupportTicketEntity,
      ReturnEntity,
      RefundEntity,
      IncidentEntity,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
