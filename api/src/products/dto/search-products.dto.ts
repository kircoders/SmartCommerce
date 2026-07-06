import { IsOptional, IsString } from 'class-validator';

export class SearchProductsDto {
  @IsString()
  @IsOptional()
  q?: string;
}
