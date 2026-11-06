// Phase 9

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../orders/entities/order.entity';
import { ShipmentEntity } from '../shipments/entities/shipment.entity';
import { IncidentEntity } from './entities/incident.entity';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';

// Orders and shipments are only read here, to check that a linked record
// exists and that a linked shipment belongs to the linked order.
@Module({
  imports: [
    TypeOrmModule.forFeature([IncidentEntity, OrderEntity, ShipmentEntity]),
  ],
  controllers: [IncidentsController],
  providers: [IncidentsService],
})
export class IncidentsModule {}
