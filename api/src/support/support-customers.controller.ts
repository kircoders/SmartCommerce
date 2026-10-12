// Phase 7

import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrderEntity } from '../orders/entities/order.entity';
import { UserEntity, UserRole } from '../users/entities/user.entity';
import { SupportTicketEntity } from './entities/support-ticket.entity';
import { SupportTicketsService } from './support-tickets.service';

// Same role set as SupportAgentController - customer lookup exists to give
// support agents context while handling a ticket.
@ApiTags('support-customer-lookup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPPORT_AGENT, UserRole.OPERATIONS_MANAGER, UserRole.ADMIN)
@Controller('support/customers')
export class SupportCustomersController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search customers by name or email' })
  @ApiQuery({ name: 'q', required: true })
  async search(@Query('q') q?: string): Promise<{ data: UserEntity[] }> {
    const data = await this.supportTicketsService.searchCustomers(q);
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: "Get a customer's profile, order history, and support ticket history" })
  async getContext(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: { profile: UserEntity; orders: OrderEntity[]; tickets: SupportTicketEntity[] } }> {
    const data = await this.supportTicketsService.getCustomerContext(id);
    return { data };
  }
}
