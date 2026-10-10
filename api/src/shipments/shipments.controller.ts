// Phase 6

import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { UpdateTrackingNumberDto } from './dto/update-tracking-number.dto';
import { ShipmentEntity, ShipmentStatus } from './entities/shipment.entity';
import { ShipmentsService } from './shipments.service';

// Warehouse-facing routes - restricted to the roles that actually run
// fulfillment, not customers (their own read-only view is on
// OrdersController's side instead, via GET /api/orders/:orderId/shipment).
@ApiTags('warehouse-shipments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.WAREHOUSE_OPERATOR, UserRole.OPERATIONS_MANAGER, UserRole.ADMIN)
@Controller('warehouse/shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List the warehouse shipment queue, optionally filtered by status' })
  @ApiQuery({ name: 'status', enum: ShipmentStatus, required: false })
  async findAll(@Query('status') status?: ShipmentStatus): Promise<{ data: ShipmentEntity[] }> {
    const data = await this.shipmentsService.findQueue(status);
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one shipment' })
  async findOne(@Param('id') id: string): Promise<{ data: ShipmentEntity }> {
    const data = await this.shipmentsService.findOneForWarehouse(id);
    return { data };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: "Update a shipment's status (also syncs the linked order's status)" })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateShipmentStatusDto,
  ): Promise<{ data: ShipmentEntity }> {
    const data = await this.shipmentsService.updateStatus(id, dto);
    return { data };
  }

  @Patch(':id/tracking')
  @ApiOperation({ summary: "Set a shipment's carrier tracking number" })
  async updateTracking(
    @Param('id') id: string,
    @Body() dto: UpdateTrackingNumberDto,
  ): Promise<{ data: ShipmentEntity }> {
    const data = await this.shipmentsService.updateTrackingNumber(id, dto);
    return { data };
  }
}
