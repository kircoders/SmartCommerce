// Phase 2

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchProductsDto } from './dto/search-products.dto';
import { ProductsService, ProductWithStock } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all active products, with stock info' })
  async findAll(): Promise<{ data: ProductWithStock[] }> {
    const data = await this.productsService.findAll();
    return { data };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search active products by name or description' })
  async search(@Query() query: SearchProductsDto): Promise<{ data: ProductWithStock[] }> {
    const data = await this.productsService.search(query.q ?? '');
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one product by id, with stock info' })
  async findOne(@Param('id') id: string): Promise<{ data: ProductWithStock }> {
    const data = await this.productsService.findOne(id);
    return { data };
  }
}
