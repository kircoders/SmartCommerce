// Phase 6

import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShipmentStatus } from '../entities/shipment.entity';

// Shape + validation rules for the body of
// PATCH /api/warehouse/shipments/:id/status. @IsIn() rejects anything
// that isn't one of the 4 warehouse statuses (e.g. a typo like "SHIPED"
// gets a 400, not silently accepted). CANCELLED (Phase 12) is deliberately
// left out - only the customer's cancel can set it, because cancelling also
// has to give the reserved stock back.
export const WAREHOUSE_STATUSES = [
  ShipmentStatus.CREATED,
  ShipmentStatus.PACKED,
  ShipmentStatus.SHIPPED,
  ShipmentStatus.DELIVERED,
];

export class UpdateShipmentStatusDto {
  @ApiProperty({ description: 'New shipment status', enum: WAREHOUSE_STATUSES })
  @IsIn(WAREHOUSE_STATUSES)
  status!: ShipmentStatus;
}
