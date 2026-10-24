// Phase 8

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { UpdateReturnStatusDto } from './dto/update-return-status.dto';
import { ReturnEntity, ReturnStatus } from './entities/return.entity';
import { ReturnsService } from './returns.service';

// SUPPORT_AGENT, OPERATIONS_MANAGER, ADMIN - review returns and move them
// through APPROVED/REJECTED/RECEIVED. Issuing the refund itself is
// RefundsController, which support agents can't do.
@ApiTags('support-returns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPPORT_AGENT, UserRole.OPERATIONS_MANAGER, UserRole.ADMIN)
@Controller('support/returns')
export class SupportReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @ApiOperation({
    summary: 'List the returns queue, most recently updated first',
  })
  @ApiQuery({ name: 'status', enum: ReturnStatus, required: false })
  async findQueue(
    @Query('status') status?: ReturnStatus,
  ): Promise<{ data: ReturnEntity[] }> {
    const data = await this.returnsService.findQueue(status);
    return { data };
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get one return with customer, order, items, photos, notes, and refund',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: ReturnEntity }> {
    const data = await this.returnsService.findOneForSupport(id);
    return { data };
  }

  @Patch(':id/status')
  @ApiOperation({
    summary:
      'Approve, reject, or mark received (restocks inventory), and/or update internal notes',
  })
  async updateStatus(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReturnStatusDto,
  ): Promise<{ data: ReturnEntity }> {
    const data = await this.returnsService.updateStatus(user.id, id, dto);
    return { data };
  }
}
