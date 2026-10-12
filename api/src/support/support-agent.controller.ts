// Phase 7

import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { SupportTicketMessageEntity } from './entities/support-ticket-message.entity';
import { SupportTicketEntity, TicketStatus } from './entities/support-ticket.entity';
import { SupportTicketsService } from './support-tickets.service';

// SUPPORT_AGENT, OPERATIONS_MANAGER, ADMIN - the spec's "operations
// managers and admins may have full support ticket visibility" is
// satisfied by giving them the same access as agents, rather than a
// separate more-privileged path - nothing here actually needs to
// distinguish "agent" from "manager reviewing agent work".
@ApiTags('support-agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPPORT_AGENT, UserRole.OPERATIONS_MANAGER, UserRole.ADMIN)
@Controller('support/agent/tickets')
export class SupportAgentController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  @Get()
  @ApiOperation({ summary: 'List the support ticket queue, optionally filtered' })
  @ApiQuery({ name: 'status', enum: TicketStatus, required: false })
  @ApiQuery({ name: 'assignedToMe', type: Boolean, required: false })
  async findQueue(
    @CurrentUser() user: { id: string },
    @Query('status') status?: TicketStatus,
    @Query('assignedToMe') assignedToMe?: string,
  ): Promise<{ data: SupportTicketEntity[] }> {
    const assignedAgentId = assignedToMe === 'true' ? user.id : undefined;
    const data = await this.supportTicketsService.findQueue(status, assignedAgentId);
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one ticket, with its full conversation' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<{ data: SupportTicketEntity }> {
    const data = await this.supportTicketsService.findOneForAgent(id);
    return { data };
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Reply to a customer on a ticket' })
  async addMessage(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTicketMessageDto,
  ): Promise<{ data: SupportTicketMessageEntity }> {
    const data = await this.supportTicketsService.addAgentMessage(user.id, id, dto);
    return { data };
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign (or reassign) a ticket to a support agent' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTicketDto,
  ): Promise<{ data: SupportTicketEntity }> {
    const data = await this.supportTicketsService.assignTicket(id, dto);
    return { data };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: "Update a ticket's status" })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketStatusDto,
  ): Promise<{ data: SupportTicketEntity }> {
    const data = await this.supportTicketsService.updateStatus(id, dto);
    return { data };
  }
}
