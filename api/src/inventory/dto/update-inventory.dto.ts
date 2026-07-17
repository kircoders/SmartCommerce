// Phase 3

import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Shape + validation rules for the body of PUT /api/inventory/:productId.
// This is the direct/corrective update path - every field optional, same
// "partial update" pattern as UpdateProductDto. Contrast with
// CreateAdjustmentDto: this path does NOT require a reason and does not
// create an inventory_adjustments row - it's meant for admin corrections,
// not day-to-day stock movement (that's what adjustments are for).
export class UpdateInventoryDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  quantityAvailable?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  quantityReserved?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  quantityTotal?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  lowStockThreshold?: number;
}
