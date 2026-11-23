// Phase 12

import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { AuditLogPage, AuditLogsService } from './audit-logs.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { AuditLogEntity } from './entities/audit-log.entity';

// ADMIN only, and read-only: there are no POST/PUT/DELETE routes. Rows are
// written automatically by AuditInterceptor.
@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Get()
  @ApiOperation({
    summary: 'List audit logs, newest first, with filters and pages',
  })
  async findAll(@Query() query: ListAuditLogsQueryDto): Promise<{
    data: AuditLogEntity[];
    meta: { total: number; page: number; pageSize: number };
  }> {
    const { items, ...meta }: AuditLogPage =
      await this.auditLogs.findAll(query);
    return { data: items, meta };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one audit log entry' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: AuditLogEntity }> {
    const data = await this.auditLogs.findOne(id);
    return { data };
  }
}
