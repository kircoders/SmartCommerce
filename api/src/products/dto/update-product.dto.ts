// Phase 2

import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Shape + validation rules for the body of PUT /admin/products/:id.
// Same fields as CreateProductDto, but every field is @IsOptional() here -
// this is a *partial* update, so you only send what's actually changing.
// Whatever fields you do send are still validated the same way.
export class UpdateProductDto {
  @ApiPropertyOptional({ description: 'New product name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'New product description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'New price in USD, up to 2 decimal places', minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({ description: 'Whether the product is visible in the catalog' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
