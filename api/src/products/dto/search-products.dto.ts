// Phase 2

import { IsOptional, IsString } from 'class-validator';

// Shape + validation for the query string of GET /products/search?q=...
// `q` is optional - the controller falls back to an empty string if it's
// missing, which effectively matches everything.
export class SearchProductsDto {
  @IsString()
  @IsOptional()
  q?: string;
}
