// Phase 11

import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CustomerAssistantService } from './customer-assistant.service';
import { CustomerChatDto } from './dto/customer-chat.dto';
import { SupportAssistDto } from './dto/support-assist.dto';
import { SupportAssistantService } from './support-assistant.service';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly customerAssistant: CustomerAssistantService,
    private readonly supportAssistant: SupportAssistantService,
  ) {}

  // CUSTOMER only: the assistant answers from the caller's own orders,
  // shipments, returns, and tickets - it only makes sense for a customer.
  @Post('customer/chat')
  @HttpCode(200)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary:
      "Ask the AI assistant a question; it answers using only the caller's own account data",
  })
  async customerChat(
    @CurrentUser() user: { id: string },
    @Body() dto: CustomerChatDto,
  ): Promise<{ data: { reply: string } }> {
    const reply = await this.customerAssistant.chat(user.id, dto);
    return { data: { reply } };
  }

  // Staff tools - the same roles that can open a ticket in the agent queue.
  // POST (not GET) because each call runs the model: it costs money and
  // gives a different answer each time, so it shouldn't be cached.
  @Post('support/tickets/:id/summary')
  @HttpCode(200)
  @Roles(UserRole.SUPPORT_AGENT, UserRole.OPERATIONS_MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'AI summary of a support ticket and its conversation',
  })
  async summarizeTicket(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: { summary: string } }> {
    const summary = await this.supportAssistant.summarize(id);
    return { data: { summary } };
  }

  @Post('support/tickets/:id/suggest-response')
  @HttpCode(200)
  @Roles(UserRole.SUPPORT_AGENT, UserRole.OPERATIONS_MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'AI draft reply to the customer - returned only, never sent',
  })
  async suggestResponse(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: { draft: string } }> {
    const draft = await this.supportAssistant.suggestResponse(id);
    return { data: { draft } };
  }

  @Post('support/assist')
  @HttpCode(200)
  @Roles(UserRole.SUPPORT_AGENT, UserRole.OPERATIONS_MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary:
      "Explain a ticket's issue, or answer a staff question about the ticket",
  })
  async assist(
    @Body() dto: SupportAssistDto,
  ): Promise<{ data: { answer: string } }> {
    const answer = await this.supportAssistant.assist(
      dto.ticketId,
      dto.question,
    );
    return { data: { answer } };
  }
}
