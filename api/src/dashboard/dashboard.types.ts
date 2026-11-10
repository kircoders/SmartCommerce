// Phase 10

// WHAT THIS FILE IS:
// The shape of each role's dashboard response. Every dashboard is a mix of
// counts ("4 shipments waiting to pack") and a few short lists ("your 5 most
// recent orders"), all read from tables built in earlier phases.

import { OrderStatus } from '../orders/entities/order.entity';
import { ReturnStatus } from '../returns/entities/return.entity';
import { ShipmentStatus } from '../shipments/entities/shipment.entity';
import {
  TicketPriority,
  TicketStatus,
} from '../support/entities/support-ticket.entity';
import { UserRole } from '../users/entities/user.entity';

export interface OrderSummaryRow {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: Date;
}

export interface ShipmentSummaryRow {
  id: string;
  orderId: string;
  status: ShipmentStatus;
  trackingNumber: string | null;
  shippedDate: Date | null;
}

export interface ReturnSummaryRow {
  id: string;
  orderId: string;
  status: ReturnStatus;
  requestedAt: Date;
}

export interface TicketSummaryRow {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  updatedAt: Date;
}

export interface LowStockRow {
  productId: string;
  productName: string;
  quantityAvailable: number;
  lowStockThreshold: number;
}

export interface CustomerDashboard {
  account: {
    firstName: string;
    lastName: string;
    email: string;
    memberSince: Date;
  };
  counts: {
    totalOrders: number;
    activeShipments: number;
    openReturns: number;
    openTickets: number;
  };
  recentOrders: OrderSummaryRow[];
  activeShipments: ShipmentSummaryRow[];
  returns: ReturnSummaryRow[];
  openTickets: TicketSummaryRow[];
}

export interface SupportDashboard {
  counts: {
    openTickets: number;
    assignedToMe: number;
    unassigned: number;
    waitingForCustomer: number;
    returnsAwaitingReview: number;
  };
  // Workload summary: every unfinished ticket, counted by status and by
  // priority. Statuses/priorities with no tickets are included as 0.
  ticketsByStatus: Record<TicketStatus, number>;
  openTicketsByPriority: Record<TicketPriority, number>;
  assignedToMe: TicketSummaryRow[];
  recentlyUpdated: TicketSummaryRow[];
}

export interface WarehouseDashboard {
  counts: {
    awaitingFulfillment: number;
    awaitingPacking: number;
    awaitingShipment: number;
    lowStockProducts: number;
  };
  inventory: {
    products: number;
    unitsAvailable: number;
    unitsReserved: number;
    outOfStock: number;
  };
  lowStock: LowStockRow[];
}

export interface OperationsDashboard {
  counts: {
    totalOrders: number;
    pendingShipments: number;
    openTickets: number;
    returnsAwaitingReview: number;
    returnsAwaitingRefund: number;
    openIncidents: number;
    criticalIncidents: number;
    lowStockProducts: number;
  };
  revenue: {
    gross: number;
    refunded: number;
    net: number;
  };
  ordersByStatus: Record<OrderStatus, number>;
  lowStock: LowStockRow[];
  systemStatus: SystemStatus;
}

export interface AdminDashboard {
  counts: {
    totalUsers: number;
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    openTickets: number;
    returnsAwaitingReview: number;
    openIncidents: number;
  };
  usersByRole: Record<UserRole, number>;
  systemStatus: SystemStatus;
}

// "Basic system status" - the API answered (or this wouldn't exist), so
// the only thing left to check is the database.
export interface SystemStatus {
  api: 'UP';
  database: 'UP' | 'DOWN';
  databaseLatencyMs: number | null;
  checkedAt: Date;
}
