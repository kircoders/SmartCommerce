// Phase 6

import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Shape + validation rules for the body of
// PATCH /api/warehouse/shipments/:id/tracking.
export class UpdateTrackingNumberDto {
  @ApiProperty({ description: 'Carrier tracking number', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  trackingNumber!: string;
}
