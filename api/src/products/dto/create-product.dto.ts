// Phase 2

import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Shape + validation rules for the body of POST /admin/products.
// NestJS runs these decorators automatically before the controller method
// executes - a request that fails any of these gets rejected with a 400,
// never reaching the service.
export class CreateProductDto {
  @ApiProperty({ description: 'Product name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Product description' })
  @IsString()
  @IsOptional()
  description?: string;

  // Request bodies arrive as JSON, so price comes in as a number already -
  // @Type(() => Number) is here mainly to coerce it if it ever arrives as a
  // string (e.g. from form data), before the @IsNumber/@Min checks run.
  @ApiProperty({ description: 'Price in USD, up to 2 decimal places', minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price!: number;

  // Optional - the service defaults this to true if omitted.
  @ApiPropertyOptional({ description: 'Whether the product is visible in the catalog (default: true)' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
