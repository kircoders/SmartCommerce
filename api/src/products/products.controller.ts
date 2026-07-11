// Phase 2

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchProductsDto } from './dto/search-products.dto';
import { ProductEntity } from './entities/product.entity';
import { ProductsService } from './products.service';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(): Promise<{ data: ProductEntity[] }> {
    const data = await this.productsService.findAll();
    return { data };
  }

  @Get('search')
  async search(@Query() query: SearchProductsDto): Promise<{ data: ProductEntity[] }> {
    const data = await this.productsService.search(query.q ?? '');
    return { data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<{ data: ProductEntity }> {
    const data = await this.productsService.findOne(id);
    return { data };
  }
}
