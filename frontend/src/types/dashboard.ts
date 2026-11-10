// Phase 10

// WHAT THIS FILE IS:
// Type definitions for the role dashboards, mirroring the backend's
// api/src/dashboard/dashboard.types.ts. Dates arrive as ISO strings (JSON
// has no Date type).

import { OrderStatus } from './order';
import { ReturnStatus } from './returns';
import { ShipmentStatus } from './shipment';
import { TicketPriority, TicketStatus } from './support';
import { UserRole } from './user';

export interface OrderSummaryRow {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
}

export interface ShipmentSummaryRow {
  id: string;
  orderId: string;
  status: ShipmentStatus;
  trackingNumber: string | null;
  shippedDate: string | null;
}

export interface ReturnSummaryRow {
  id: string;
  orderId: string;
  status: ReturnStatus;
  requestedAt: string;
}

export interface TicketSummaryRow {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  updatedAt: string;
}

export interface LowStockRow {
  productId: string;
  productName: string;
  quantityAvailable: number;
  lowStockThreshold: number;
}

export interface SystemStatus {
  api: 'UP';
  database: 'UP' | 'DOWN';
  databaseLatencyMs: number | null;
  checkedAt: string;
}

export interface CustomerDashboardData {
  account: { firstName: string; lastName: string; email: string; memberSince: string };
  counts: { totalOrders: number; activeShipments: number; openReturns: number; openTickets: number };
  recentOrders: OrderSummaryRow[];
  activeShipments: ShipmentSummaryRow[];
  returns: ReturnSummaryRow[];
  openTickets: TicketSummaryRow[];
}

export interface SupportDashboardData {
  counts: {
    openTickets: number;
    assignedToMe: number;
    unassigned: number;
    waitingForCustomer: number;
    returnsAwaitingReview: number;
  };
  ticketsByStatus: Record<TicketStatus, number>;
  openTicketsByPriority: Record<TicketPriority, number>;
  assignedToMe: TicketSummaryRow[];
  recentlyUpdated: TicketSummaryRow[];
}

export interface WarehouseDashboardData {
  counts: { awaitingFulfillment: number; awaitingPacking: number; awaitingShipment: number; lowStockProducts: number };
  inventory: { products: number; unitsAvailable: number; unitsReserved: number; outOfStock: number };
  lowStock: LowStockRow[];
}

export interface OperationsDashboardData {
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
  revenue: { gross: number; refunded: number; net: number };
  ordersByStatus: Record<OrderStatus, number>;
  lowStock: LowStockRow[];
  systemStatus: SystemStatus;
}

export interface AdminDashboardData {
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

// "WAITING_FOR_CUSTOMER" -> "Waiting for customer". Used for order and
// shipment statuses and roles, which don't have their own label maps.
export function humanize(value: string): string {
  const words = value.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}
