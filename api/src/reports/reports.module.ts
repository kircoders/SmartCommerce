// Phase 10

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncidentEntity } from '../incidents/entities/incident.entity';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { RefundEntity } from '../returns/entities/refund.entity';
import { ReturnEntity } from '../returns/entities/return.entity';
import { ShipmentEntity } from '../shipments/entities/shipment.entity';
import { SupportTicketEntity } from '../support/entities/support-ticket.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

// Reports are generated on the fly from existing tables - nothing is
// saved, so there's no reports table (the spec makes it optional).
@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      RefundEntity,
      ShipmentEntity,
      ReturnEntity,
      SupportTicketEntity,
      IncidentEntity,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
