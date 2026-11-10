// Phase 10

// WHAT THIS FILE IS:
// The numbers behind each role's dashboard. Nothing here creates or changes
// data - every method only reads tables built in earlier phases and adds
// them up. Each dashboard asks several small questions at once with
// Promise.all, so a page load is one request to us and the database
// queries run side by side instead of one after another.

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, ObjectLiteral, Repository } from 'typeorm';
import {
  IncidentEntity,
  IncidentSeverity,
  IncidentStatus,
} from '../incidents/entities/incident.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { OrderEntity, OrderStatus } from '../orders/entities/order.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { RefundEntity, RefundStatus } from '../returns/entities/refund.entity';
import { ReturnEntity, ReturnStatus } from '../returns/entities/return.entity';
import {
  ShipmentEntity,
  ShipmentStatus,
} from '../shipments/entities/shipment.entity';
import {
  SupportTicketEntity,
  TicketPriority,
  TicketStatus,
} from '../support/entities/support-ticket.entity';
import { UserEntity, UserRole } from '../users/entities/user.entity';
import {
  AdminDashboard,
  CustomerDashboard,
  LowStockRow,
  OperationsDashboard,
  OrderSummaryRow,
  ReturnSummaryRow,
  ShipmentSummaryRow,
  SupportDashboard,
  SystemStatus,
  TicketSummaryRow,
  WarehouseDashboard,
} from './dashboard.types';

// What "still needs something" means for each kind of record. Kept in one
// place so every dashboard counts the same way.
const OPEN_TICKET_STATUSES = [
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.WAITING_FOR_CUSTOMER,
];
const OPEN_RETURN_STATUSES = [
  ReturnStatus.REQUESTED,
  ReturnStatus.APPROVED,
  ReturnStatus.RECEIVED,
];
const ACTIVE_SHIPMENT_STATUSES = [
  ShipmentStatus.CREATED,
  ShipmentStatus.PACKED,
  ShipmentStatus.SHIPPED,
];
const PENDING_SHIPMENT_STATUSES = [
  ShipmentStatus.CREATED,
  ShipmentStatus.PACKED,
];
const OPEN_INCIDENT_STATUSES = [
  IncidentStatus.OPEN,
  IncidentStatus.IN_PROGRESS,
];

const LIST_LIMIT = 5;
const LOW_STOCK_LIMIT = 10;

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(InventoryEntity)
    private readonly inventoryRepo: Repository<InventoryEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(ShipmentEntity)
    private readonly shipmentRepo: Repository<ShipmentEntity>,
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
    @InjectRepository(ReturnEntity)
    private readonly returnRepo: Repository<ReturnEntity>,
    @InjectRepository(RefundEntity)
    private readonly refundRepo: Repository<RefundEntity>,
    @InjectRepository(IncidentEntity)
    private readonly incidentRepo: Repository<IncidentEntity>,
  ) {}

  // ---------- Customer: only ever their own records (customerId from the token) ----------

  async getCustomer(userId: string): Promise<CustomerDashboard> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const [
      totalOrders,
      recentOrders,
      activeShipments,
      openReturns,
      returns,
      openTickets,
    ] = await Promise.all([
      this.orderRepo.countBy({ customerId: userId }),
      this.orderRepo.find({
        where: { customerId: userId },
        order: { createdAt: 'DESC' },
        take: LIST_LIMIT,
      }),
      // Shipments don't store the customer - it's on their order, so filter
      // through the order relation.
      this.shipmentRepo.find({
        where: {
          order: { customerId: userId },
          status: In(ACTIVE_SHIPMENT_STATUSES),
        },
        order: { createdAt: 'DESC' },
      }),
      this.returnRepo.countBy({
        customerId: userId,
        status: In(OPEN_RETURN_STATUSES),
      }),
      this.returnRepo.find({
        where: { customerId: userId },
        order: { requestedAt: 'DESC' },
        take: LIST_LIMIT,
      }),
      this.ticketRepo.find({
        where: { customerId: userId, status: In(OPEN_TICKET_STATUSES) },
        order: { updatedAt: 'DESC' },
      }),
    ]);

    return {
      account: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        memberSince: user.createdAt,
      },
      counts: {
        totalOrders,
        activeShipments: activeShipments.length,
        openReturns,
        openTickets: openTickets.length,
      },
      recentOrders: recentOrders.map(toOrderRow),
      activeShipments: activeShipments.map(toShipmentRow),
      returns: returns.map(toReturnRow),
      openTickets: openTickets.slice(0, LIST_LIMIT).map(toTicketRow),
    };
  }

  // ---------- Support: the ticket queue and returns waiting for review ----------

  async getSupport(agentId: string): Promise<SupportDashboard> {
    const [
      ticketsByStatus,
      openTicketsByPriority,
      assignedToMeCount,
      unassigned,
      returnsAwaitingReview,
      assignedToMe,
      recentlyUpdated,
    ] = await Promise.all([
      this.countByColumn(
        this.ticketRepo,
        'status',
        Object.values(TicketStatus),
      ),
      this.countByColumn(
        this.ticketRepo,
        'priority',
        Object.values(TicketPriority),
        {
          status: OPEN_TICKET_STATUSES,
        },
      ),
      this.ticketRepo.countBy({
        assignedAgentId: agentId,
        status: In(OPEN_TICKET_STATUSES),
      }),
      // IsNull() becomes "assigned_agent_id IS NULL" - a plain `null` here
      // wouldn't (in SQL, nothing equals NULL, not even NULL).
      this.ticketRepo.countBy({
        assignedAgentId: IsNull(),
        status: In(OPEN_TICKET_STATUSES),
      }),
      this.returnRepo.countBy({ status: ReturnStatus.REQUESTED }),
      this.ticketRepo.find({
        where: { assignedAgentId: agentId, status: In(OPEN_TICKET_STATUSES) },
        order: { updatedAt: 'DESC' },
        take: LIST_LIMIT,
      }),
      this.ticketRepo.find({ order: { updatedAt: 'DESC' }, take: LIST_LIMIT }),
    ]);

    const openTickets = OPEN_TICKET_STATUSES.reduce(
      (sum, s) => sum + ticketsByStatus[s],
      0,
    );

    return {
      counts: {
        openTickets,
        assignedToMe: assignedToMeCount,
        unassigned,
        waitingForCustomer: ticketsByStatus[TicketStatus.WAITING_FOR_CUSTOMER],
        returnsAwaitingReview,
      },
      ticketsByStatus,
      openTicketsByPriority,
      assignedToMe: assignedToMe.map(toTicketRow),
      recentlyUpdated: recentlyUpdated.map(toTicketRow),
    };
  }

  // ---------- Warehouse: shipments to work on and stock levels ----------

  async getWarehouse(): Promise<WarehouseDashboard> {
    const [shipmentsByStatus, inventory, lowStockCount, lowStock] =
      await Promise.all([
        this.countByColumn(
          this.shipmentRepo,
          'status',
          Object.values(ShipmentStatus),
        ),
        this.getInventorySummary(),
        this.countLowStock(),
        this.findLowStock(),
      ]);

    const awaitingPacking = shipmentsByStatus[ShipmentStatus.CREATED];
    const awaitingShipment = shipmentsByStatus[ShipmentStatus.PACKED];

    return {
      counts: {
        // Every order gets a shipment when it's placed, so "orders waiting
        // to be fulfilled" = shipments that haven't left the building yet.
        awaitingFulfillment: awaitingPacking + awaitingShipment,
        awaitingPacking,
        awaitingShipment,
        lowStockProducts: lowStockCount,
      },
      inventory,
      lowStock,
    };
  }

  // ---------- Operations: the whole business at a glance ----------

  async getOperations(): Promise<OperationsDashboard> {
    const [
      ordersByStatus,
      revenue,
      pendingShipments,
      openTickets,
      returnsAwaitingReview,
      returnsAwaitingRefund,
      openIncidents,
      criticalIncidents,
      lowStockCount,
      lowStock,
      systemStatus,
    ] = await Promise.all([
      this.countByColumn(this.orderRepo, 'status', Object.values(OrderStatus)),
      this.getRevenue(),
      this.shipmentRepo.countBy({ status: In(PENDING_SHIPMENT_STATUSES) }),
      this.ticketRepo.countBy({ status: In(OPEN_TICKET_STATUSES) }),
      this.returnRepo.countBy({ status: ReturnStatus.REQUESTED }),
      // Received back but not refunded yet - only ops/admin can refund.
      this.returnRepo.countBy({ status: ReturnStatus.RECEIVED }),
      this.incidentRepo.countBy({ status: In(OPEN_INCIDENT_STATUSES) }),
      this.incidentRepo.countBy({
        status: In(OPEN_INCIDENT_STATUSES),
        severity: IncidentSeverity.CRITICAL,
      }),
      this.countLowStock(),
      this.findLowStock(),
      this.getSystemStatus(),
    ]);

    const totalOrders = Object.values(ordersByStatus).reduce(
      (sum, n) => sum + n,
      0,
    );

    return {
      counts: {
        totalOrders,
        pendingShipments,
        openTickets,
        returnsAwaitingReview,
        returnsAwaitingRefund,
        openIncidents,
        criticalIncidents,
        lowStockProducts: lowStockCount,
      },
      revenue,
      ordersByStatus,
      lowStock,
      systemStatus,
    };
  }

  // ---------- Admin: platform-wide totals ----------

  async getAdmin(): Promise<AdminDashboard> {
    const [
      usersByRole,
      totalProducts,
      activeProducts,
      totalOrders,
      openTickets,
      returnsAwaitingReview,
      openIncidents,
      systemStatus,
    ] = await Promise.all([
      this.countByColumn(this.userRepo, 'role', Object.values(UserRole)),
      this.productRepo.count(),
      this.productRepo.countBy({ isActive: true }),
      this.orderRepo.count(),
      this.ticketRepo.countBy({ status: In(OPEN_TICKET_STATUSES) }),
      this.returnRepo.countBy({ status: ReturnStatus.REQUESTED }),
      this.incidentRepo.countBy({ status: In(OPEN_INCIDENT_STATUSES) }),
      this.getSystemStatus(),
    ]);

    const totalUsers = Object.values(usersByRole).reduce(
      (sum, n) => sum + n,
      0,
    );

    return {
      counts: {
        totalUsers,
        totalProducts,
        activeProducts,
        totalOrders,
        openTickets,
        returnsAwaitingReview,
        openIncidents,
      },
      usersByRole,
      systemStatus,
    };
  }

  // ---------- Shared helpers ----------

  // One GROUP BY query instead of one COUNT per value:
  //   SELECT status, COUNT(*) FROM orders GROUP BY status
  // Postgres only returns values that actually have rows, so every possible
  // value starts at 0 and the query fills in the ones it found.
  private async countByColumn<E extends ObjectLiteral, T extends string>(
    repo: Repository<E>,
    column: string,
    values: T[],
    filter?: { status: string[] },
  ): Promise<Record<T, number>> {
    const query = repo
      .createQueryBuilder('r')
      .select(`r.${column}`, 'value')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`r.${column}`);
    if (filter)
      query.where('r.status IN (:...statuses)', { statuses: filter.status });

    const rows = await query.getRawMany<{ value: string; count: string }>();

    const counts = Object.fromEntries(values.map((v) => [v, 0])) as Record<
      T,
      number
    >;
    for (const row of rows) {
      // COUNT comes back from Postgres as a string (it can exceed JS's
      // safe integer range), so convert it.
      if (row.value in counts) counts[row.value as T] = Number(row.count);
    }
    return counts;
  }

  // Gross = every order that wasn't cancelled. Refunded = completed refunds.
  // Net = what the business actually kept.
  private async getRevenue(): Promise<{
    gross: number;
    refunded: number;
    net: number;
  }> {
    const [orders, refunds] = await Promise.all([
      this.orderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.total_amount), 0)', 'total')
        .where('o.status <> :cancelled', { cancelled: OrderStatus.CANCELLED })
        .getRawOne<{ total: string }>(),
      this.refundRepo
        .createQueryBuilder('r')
        .select('COALESCE(SUM(r.amount), 0)', 'total')
        .where('r.status = :completed', { completed: RefundStatus.COMPLETED })
        .getRawOne<{ total: string }>(),
    ]);
    const gross = Number(orders?.total ?? 0);
    const refunded = Number(refunds?.total ?? 0);
    return { gross, refunded, net: roundMoney(gross - refunded) };
  }

  private async getInventorySummary(): Promise<
    WarehouseDashboard['inventory']
  > {
    const row = await this.inventoryRepo
      .createQueryBuilder('i')
      .select('COUNT(*)', 'products')
      .addSelect('COALESCE(SUM(i.quantity_available), 0)', 'available')
      .addSelect('COALESCE(SUM(i.quantity_reserved), 0)', 'reserved')
      .addSelect(
        'COUNT(*) FILTER (WHERE i.quantity_available = 0)',
        'outOfStock',
      )
      .getRawOne<{
        products: string;
        available: string;
        reserved: string;
        outOfStock: string;
      }>();
    return {
      products: Number(row?.products ?? 0),
      unitsAvailable: Number(row?.available ?? 0),
      unitsReserved: Number(row?.reserved ?? 0),
      outOfStock: Number(row?.outOfStock ?? 0),
    };
  }

  // Same rule as the inventory page: at or below the product's own
  // threshold. Two columns compared to each other, so it needs the builder.
  private countLowStock(): Promise<number> {
    return this.inventoryRepo
      .createQueryBuilder('i')
      .where('i.quantity_available <= i.low_stock_threshold')
      .getCount();
  }

  // The emptiest shelves first, capped at 10 - the count above has the total.
  private async findLowStock(): Promise<LowStockRow[]> {
    const rows = await this.inventoryRepo
      .createQueryBuilder('i')
      .innerJoinAndSelect('i.product', 'p')
      .where('i.quantity_available <= i.low_stock_threshold')
      .orderBy('i.quantity_available', 'ASC')
      .addOrderBy('p.name', 'ASC')
      .take(LOW_STOCK_LIMIT)
      .getMany();
    return rows.map((i) => ({
      productId: i.productId,
      productName: i.product.name,
      quantityAvailable: i.quantityAvailable,
      lowStockThreshold: i.lowStockThreshold,
    }));
  }

  // Times a trivial query. If the database can't answer, report DOWN
  // instead of failing the request.
  private async getSystemStatus(): Promise<SystemStatus> {
    const started = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      return {
        api: 'UP',
        database: 'UP',
        databaseLatencyMs: Date.now() - started,
        checkedAt: new Date(),
      };
    } catch (err) {
      this.logger.error(
        `Database health check failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return {
        api: 'UP',
        database: 'DOWN',
        databaseLatencyMs: null,
        checkedAt: new Date(),
      };
    }
  }
}

// ---------- Row mappers: send only what a dashboard list needs ----------

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function toOrderRow(o: OrderEntity): OrderSummaryRow {
  // numeric columns arrive as strings from Postgres.
  return {
    id: o.id,
    status: o.status,
    totalAmount: Number(o.totalAmount),
    createdAt: o.createdAt,
  };
}

function toShipmentRow(s: ShipmentEntity): ShipmentSummaryRow {
  return {
    id: s.id,
    orderId: s.orderId,
    status: s.status,
    trackingNumber: s.trackingNumber,
    shippedDate: s.shippedDate,
  };
}

function toReturnRow(r: ReturnEntity): ReturnSummaryRow {
  return {
    id: r.id,
    orderId: r.orderId,
    status: r.status,
    requestedAt: r.requestedAt,
  };
}

function toTicketRow(t: SupportTicketEntity): TicketSummaryRow {
  return {
    id: t.id,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    updatedAt: t.updatedAt,
  };
}
