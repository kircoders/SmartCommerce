// Phase 6

import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShipmentStatus } from '../entities/shipment.entity';

// Shape + validation rules for the body of
// PATCH /api/warehouse/shipments/:id/status. @IsEnum() rejects anything
// that isn't one of the 4 real ShipmentStatus values (e.g. a typo like
// "SHIPED" gets a 400, not silently accepted).
export class UpdateShipmentStatusDto {
  @ApiProperty({ description: 'New shipment status', enum: ShipmentStatus })
  @IsEnum(ShipmentStatus)
  status!: ShipmentStatus;
}
