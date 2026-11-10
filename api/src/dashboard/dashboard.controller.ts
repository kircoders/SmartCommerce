// Phase 10

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { DashboardService } from './dashboard.service';
import {
  AdminDashboard,
  CustomerDashboard,
  OperationsDashboard,
  SupportDashboard,
  WarehouseDashboard,
} from './dashboard.types';

// One read-only endpoint per role. Each one is locked to the role it's for,
// plus the roles above it that can already see that area of the app (the
// same groups as the support, warehouse, and incident controllers).
// The customer dashboard is CUSTOMER only - it's "my orders", so it only
// makes sense for someone who places orders.
@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('customer')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary:
      "The caller's own recent orders, active shipments, returns, open tickets, and account info",
  })
  async getCustomer(
    @CurrentUser() user: { id: string },
  ): Promise<{ data: CustomerDashboard }> {
    const data = await this.dashboardService.getCustomer(user.id);
    return { data };
  }

  @Get('support')
  @Roles(UserRole.SUPPORT_AGENT, UserRole.OPERATIONS_MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Ticket counts and workload, tickets assigned to the caller, returns awaiting review',
  })
  async getSupport(
    @CurrentUser() user: { id: string },
  ): Promise<{ data: SupportDashboard }> {
    const data = await this.dashboardService.getSupport(user.id);
    return { data };
  }

  @Get('warehouse')
  @Roles(
    UserRole.WAREHOUSE_OPERATOR,
    UserRole.OPERATIONS_MANAGER,
    UserRole.ADMIN,
  )
  @ApiOperation({
    summary:
      'Shipments waiting to be packed or shipped, low stock, and an inventory summary',
  })
  async getWarehouse(): Promise<{ data: WarehouseDashboard }> {
    const data = await this.dashboardService.getWarehouse();
    return { data };
  }

  @Get('operations')
  @Roles(UserRole.OPERATIONS_MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Business KPIs: orders, revenue, pending work in every area, low stock, system status',
  })
  async getOperations(): Promise<{ data: OperationsDashboard }> {
    const data = await this.dashboardService.getOperations();
    return { data };
  }

  @Get('admin')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Platform totals: users by role, products, orders, open work, system status',
  })
  async getAdmin(): Promise<{ data: AdminDashboard }> {
    const data = await this.dashboardService.getAdmin();
    return { data };
  }
}
