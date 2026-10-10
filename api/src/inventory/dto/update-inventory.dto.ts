// Phase 3

import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Shape + validation rules for the body of PUT /api/inventory/:productId.
// This is the direct/corrective update path - every field optional, same
// "partial update" pattern as UpdateProductDto. Contrast with
// CreateAdjustmentDto: this path does NOT require a reason and does not
// create an inventory_adjustments row - it's meant for admin corrections,
// not day-to-day stock movement (that's what adjustments are for).
export class UpdateInventoryDto {
  @ApiPropertyOptional({ description: 'New available quantity', minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  quantityAvailable?: number;

  @ApiPropertyOptional({ description: 'New reserved quantity', minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  quantityReserved?: number;

  @ApiPropertyOptional({ description: 'New total quantity', minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  quantityTotal?: number;

  @ApiPropertyOptional({ description: 'New low-stock alert threshold', minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  lowStockThreshold?: number;
}
