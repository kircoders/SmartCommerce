// Phase 3

import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { InventoryAdjustmentEntity } from './entities/inventory-adjustment.entity';
import { InventoryEntity } from './entities/inventory.entity';
import { InventoryService } from './inventory.service';

// Unlike products (public read-only controller + separate admin-only
// controller), inventory has ONE access tier for everything - reads
// included. CUSTOMER and SUPPORT_AGENT are blocked from every route here,
// not just writes.
@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.WAREHOUSE_OPERATOR, UserRole.OPERATIONS_MANAGER, UserRole.ADMIN)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all inventory records (warehouse/ops/admin only)' })
  async findAll(): Promise<{ data: InventoryEntity[] }> {
    const data = await this.inventoryService.findAll();
    return { data };
  }

  // Must come before @Get(':productId') - otherwise "low-stock" would
  // match as a literal productId instead of hitting this route.
  @Get('low-stock')
  @ApiOperation({ summary: 'List products at or below their low-stock threshold' })
  async findLowStock(): Promise<{ data: InventoryEntity[] }> {
    const data = await this.inventoryService.findLowStock();
    return { data };
  }

  @Get(':productId')
  @ApiOperation({ summary: "Get one product's inventory record" })
  async findOne(@Param('productId') productId: string): Promise<{ data: InventoryEntity }> {
    const data = await this.inventoryService.findOne(productId);
    return { data };
  }

  @Put(':productId')
  @ApiOperation({ summary: 'Directly correct stock quantities/threshold (no audit trail)' })
  async update(
    @Param('productId') productId: string,
    @Body() dto: UpdateInventoryDto,
  ): Promise<{ data: InventoryEntity }> {
    const data = await this.inventoryService.update(productId, dto);
    return { data };
  }

  @Post('adjustments')
  @ApiOperation({ summary: 'Record an audited stock change (increase/decrease/correction)' })
  async createAdjustment(
    @Body() dto: CreateAdjustmentDto,
    @CurrentUser() user: { id: string },
  ): Promise<{ data: InventoryAdjustmentEntity }> {
    const data = await this.inventoryService.createAdjustment(dto, user.id);
    return { data };
  }

  @Get(':productId/adjustments')
  @ApiOperation({ summary: "Get a product's full adjustment history" })
  async findAdjustments(
    @Param('productId') productId: string,
  ): Promise<{ data: InventoryAdjustmentEntity[] }> {
    const data = await this.inventoryService.findAdjustments(productId);
    return { data };
  }
}
