// Phase 2

import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Shape + validation rules for the body of PUT /admin/products/:id.
// Same fields as CreateProductDto, but every field is @IsOptional() here -
// this is a *partial* update, so you only send what's actually changing.
// Whatever fields you do send are still validated the same way.
export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
