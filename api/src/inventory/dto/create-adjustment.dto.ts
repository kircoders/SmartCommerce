// Phase 3

import { IsEnum, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { AdjustmentType } from '../entities/inventory-adjustment.entity';

// Shape + validation rules for the body of POST /api/inventory/adjustments.
// This is the AUDITED stock-change path - every adjustment becomes a
// permanent inventory_adjustments row. Note adjustedBy is NOT a field here:
// same reasoning as createdBy on CreateProductDto - it comes from
// @CurrentUser() server-side, never from client input, so a user can't
// attribute a change to someone else.
export class CreateAdjustmentDto {
  @IsUUID()
  productId!: string;

  @IsEnum(AdjustmentType)
  adjustmentType!: AdjustmentType;

  // Signed - positive for an increase, negative for a decrease/correction
  // downward. Not restricted to >= 0 like UpdateInventoryDto's fields,
  // because this represents a CHANGE, not a resulting total.
  @IsInt()
  @Type(() => Number)
  quantityChange!: number;

  @IsString()
  @IsOptional()
  reason?: string;
}
