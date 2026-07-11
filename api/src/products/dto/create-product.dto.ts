// Phase 2

import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Shape + validation rules for the body of POST /admin/products.
// NestJS runs these decorators automatically before the controller method
// executes - a request that fails any of these gets rejected with a 400,
// never reaching the service.
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  // Request bodies arrive as JSON, so price comes in as a number already -
  // @Type(() => Number) is here mainly to coerce it if it ever arrives as a
  // string (e.g. from form data), before the @IsNumber/@Min checks run.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price!: number;

  // Optional - the service defaults this to true if omitted.
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
