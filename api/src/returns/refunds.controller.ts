// Phase 8

import {
  Body,
  Controller,
  Get,
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
import { CreateRefundDto } from './dto/create-refund.dto';
import { RefundEntity } from './entities/refund.entity';
import { RefundsService } from './refunds.service';

// Viewing a refund: anyone who can see returns on the staff side. Issuing
// one: OPERATIONS_MANAGER and ADMIN only - the method-level @Roles on
// create() overrides the class-level one.
@ApiTags('refunds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPPORT_AGENT, UserRole.OPERATIONS_MANAGER, UserRole.ADMIN)
@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  @Roles(UserRole.OPERATIONS_MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Refund a RECEIVED return (amount is calculated) and mark it REFUNDED',
  })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRefundDto,
  ): Promise<{ data: RefundEntity }> {
    const data = await this.refundsService.createRefund(user.id, dto);
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one refund' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: RefundEntity }> {
    const data = await this.refundsService.findOne(id);
    return { data };
  }
}
