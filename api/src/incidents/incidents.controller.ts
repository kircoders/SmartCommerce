// Phase 9

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { ListIncidentsQueryDto } from './dto/list-incidents-query.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { IncidentEntity } from './entities/incident.entity';
import { IncidentSummary, IncidentsService } from './incidents.service';

// OPERATIONS_MANAGER and ADMIN only - every route, reads included.
// Customers, support agents, and warehouse operators get 403.
@ApiTags('incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OPERATIONS_MANAGER, UserRole.ADMIN)
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an incident (starts OPEN)' })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateIncidentDto,
  ): Promise<{ data: IncidentEntity }> {
    const data = await this.incidentsService.createIncident(user.id, dto);
    return { data };
  }

  @Get()
  @ApiOperation({
    summary:
      'List incidents, most recently updated first - filter by status, severity, type, and/or search',
  })
  async findAll(
    @Query() query: ListIncidentsQueryDto,
  ): Promise<{ data: IncidentEntity[] }> {
    const data = await this.incidentsService.findAll(query);
    return { data };
  }

  // Declared before :id so "summary" isn't read as an id.
  @Get('summary')
  @ApiOperation({
    summary:
      'Counts for the operations dashboard: open, critical, resolved in the last 7 days',
  })
  async getSummary(): Promise<{ data: IncidentSummary }> {
    const data = await this.incidentsService.getSummary();
    return { data };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one incident with its creator, order, and shipment',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: IncidentEntity }> {
    const data = await this.incidentsService.findOne(id);
    return { data };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Edit title, type, severity, description, and/or notes',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentDto,
  ): Promise<{ data: IncidentEntity }> {
    const data = await this.incidentsService.updateIncident(id, dto);
    return { data };
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Change status (RESOLVED stores the resolved date)',
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentStatusDto,
  ): Promise<{ data: IncidentEntity }> {
    const data = await this.incidentsService.updateStatus(id, dto.status);
    return { data };
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Mark resolved - shortcut for status RESOLVED' })
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: IncidentEntity }> {
    const data = await this.incidentsService.resolve(id);
    return { data };
  }
}
