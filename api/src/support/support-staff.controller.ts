// Phase 7

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserEntity, UserRole } from '../users/entities/user.entity';
import { SupportTicketsService } from './support-tickets.service';

// The support agents themselves - a separate resource from tickets and
// customers, so its own controller (same reasoning as the other two). Feeds
// the frontend's "assign to" dropdown; not in the original Phase 7 spec,
// but assignment can't be done from the UI without knowing who the agents are.
@ApiTags('support-staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPPORT_AGENT, UserRole.OPERATIONS_MANAGER, UserRole.ADMIN)
@Controller('support/agents')
export class SupportStaffController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  @Get()
  @ApiOperation({ summary: 'List support agents (for assigning tickets)' })
  async findAll(): Promise<{ data: UserEntity[] }> {
    const data = await this.supportTicketsService.findAgents();
    return { data };
  }
}
