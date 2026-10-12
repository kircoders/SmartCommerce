// Phase 7

import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { SupportTicketMessageEntity } from './entities/support-ticket-message.entity';
import { SupportTicketEntity } from './entities/support-ticket.entity';
import { SupportTicketsService } from './support-tickets.service';

// CUSTOMER only - a support ticket is exclusively the submitting
// customer's own data, same pattern as OrdersController/CartController.
@ApiTags('support-tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('support/tickets')
export class SupportTicketsController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new support ticket' })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSupportTicketDto,
  ): Promise<{ data: SupportTicketEntity }> {
    const data = await this.supportTicketsService.createTicket(user.id, dto);
    return { data };
  }

  @Get('me')
  @ApiOperation({ summary: "List the current customer's own support tickets" })
  async findMine(@CurrentUser() user: { id: string }): Promise<{ data: SupportTicketEntity[] }> {
    const data = await this.supportTicketsService.findAllForCustomer(user.id);
    return { data };
  }

  @Get('me/:id')
  @ApiOperation({ summary: "Get one of the current customer's own tickets, with its conversation" })
  async findOneMine(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: SupportTicketEntity }> {
    const data = await this.supportTicketsService.findOneForCustomer(user.id, id);
    return { data };
  }

  @Post(':id/messages')
  @ApiOperation({ summary: "Reply to one of the current customer's own tickets" })
  async addMessage(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTicketMessageDto,
  ): Promise<{ data: SupportTicketMessageEntity }> {
    const data = await this.supportTicketsService.addCustomerMessage(user.id, id, dto);
    return { data };
  }
}
