// Phase 10

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';
import {
  BusinessSummary,
  IncidentsReport,
  OrdersReport,
  ReturnsReport,
  RevenueReport,
  ShipmentsReport,
  SupportReport,
} from './reports.types';

// Business reports - OPERATIONS_MANAGER and ADMIN only, so the role check
// sits on the whole class: customers, support agents, and warehouse
// operators get 403 on every route here.
// Every route takes the same ?from=&to=&groupBy=&timeZone= query.
@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OPERATIONS_MANAGER, UserRole.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({
    summary: 'Business summary: headline numbers from every report',
  })
  async getSummary(
    @Query() query: ReportQueryDto,
  ): Promise<{ data: BusinessSummary }> {
    return { data: await this.reportsService.getSummary(query) };
  }

  @Get('orders')
  @ApiOperation({
    summary: 'Orders placed, by status, items sold, top products',
  })
  async getOrders(
    @Query() query: ReportQueryDto,
  ): Promise<{ data: OrdersReport }> {
    return { data: await this.reportsService.getOrders(query) };
  }

  @Get('revenue')
  @ApiOperation({
    summary: 'Gross sales, refunds, net revenue, average order value',
  })
  async getRevenue(
    @Query() query: ReportQueryDto,
  ): Promise<{ data: RevenueReport }> {
    return { data: await this.reportsService.getRevenue(query) };
  }

  @Get('shipments')
  @ApiOperation({
    summary: 'Shipments created, shipped, delivered, and how long it took',
  })
  async getShipments(
    @Query() query: ReportQueryDto,
  ): Promise<{ data: ShipmentsReport }> {
    return { data: await this.reportsService.getShipments(query) };
  }

  @Get('returns')
  @ApiOperation({ summary: 'Returns requested, return rate, refunds paid' })
  async getReturns(
    @Query() query: ReportQueryDto,
  ): Promise<{ data: ReturnsReport }> {
    return { data: await this.reportsService.getReturns(query) };
  }

  @Get('support')
  @ApiOperation({
    summary: 'Tickets opened and closed, by status/priority/category',
  })
  async getSupport(
    @Query() query: ReportQueryDto,
  ): Promise<{ data: SupportReport }> {
    return { data: await this.reportsService.getSupport(query) };
  }

  @Get('incidents')
  @ApiOperation({
    summary: 'Incidents opened and resolved, by status/severity/type',
  })
  async getIncidents(
    @Query() query: ReportQueryDto,
  ): Promise<{ data: IncidentsReport }> {
    return { data: await this.reportsService.getIncidents(query) };
  }
}
