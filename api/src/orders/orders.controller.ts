// Phase 5

import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { ShipmentEntity } from '../shipments/entities/shipment.entity';
import { ShipmentsService } from '../shipments/shipments.service';
import { OrderEntity } from './entities/order.entity';
import { OrdersService } from './orders.service';
import { Audit, field, money, shortId } from '../audit-logs/audit.decorator';
import {
  AuditAction,
  AuditEntityType,
} from '../audit-logs/entities/audit-log.entity';

// CUSTOMER only, same reasoning as cart.controller.ts - an order is
// exclusively the purchasing customer's own data. No admin/operations view
// of all orders yet - that's a reasonable follow-up, not built here.
//
// placeOrder takes no @Body() at all - there's nothing for the client to
// send. Everything the order needs (customer, items, prices) already
// exists server-side, in the customer's own active cart.
@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly shipmentsService: ShipmentsService,
  ) {}

  @Post()
  @Audit({
    action: AuditAction.ORDER_PLACED,
    entityType: AuditEntityType.ORDER,
    describe: ({ data }) =>
      `Placed order ${shortId(field(data, 'id'))} (${money(field(data, 'totalAmount'))})`,
  })
  @ApiOperation({
    summary: "Place an order from the customer's current active cart",
  })
  async placeOrder(
    @CurrentUser() user: { id: string },
  ): Promise<{ data: OrderEntity }> {
    const data = await this.ordersService.placeOrder(user.id);
    return { data };
  }

  // Phase 12. Only before it ships - see OrdersService.cancelOrder().
  @Patch(':id/cancel')
  @Audit({
    action: AuditAction.ORDER_CANCELLED,
    entityType: AuditEntityType.ORDER,
    describe: ({ data }) =>
      `Cancelled order ${shortId(field(data, 'id'))} (${money(field(data, 'totalAmount'))})`,
  })
  @ApiOperation({
    summary:
      "Cancel one of the current customer's own orders (only before it ships) - gives the reserved stock back",
  })
  async cancel(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: OrderEntity }> {
    const data = await this.ordersService.cancelOrder(user.id, id);
    return { data };
  }

  @Get()
  @ApiOperation({ summary: "List the current customer's own orders" })
  async findAll(
    @CurrentUser() user: { id: string },
  ): Promise<{ data: OrderEntity[] }> {
    const data = await this.ordersService.findAllForCustomer(user.id);
    return { data };
  }

  @Get(':id')
  @ApiOperation({
    summary: "Get one of the current customer's own orders, with its items",
  })
  async findOne(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<{ data: OrderEntity }> {
    const data = await this.ordersService.findOneForCustomer(user.id, id);
    return { data };
  }

  @Get(':id/shipment')
  @ApiOperation({
    summary: "Get the shipment for one of the current customer's own orders",
  })
  async findShipment(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<{ data: ShipmentEntity }> {
    const data = await this.shipmentsService.findForCustomerOrder(user.id, id);
    return { data };
  }
}
