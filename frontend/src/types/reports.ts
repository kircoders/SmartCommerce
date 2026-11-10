// Phase 10

// WHAT THIS FILE IS:
// Type definitions for the business reports, mirroring the backend's
// api/src/reports/reports.types.ts. Every report covers one date range and
// has the same parts: totals (headline numbers), breakdowns ("by status"),
// and a timeline (one row per day/week/month).

export type ReportGroupBy = 'day' | 'week' | 'month';

// The URL segment after /api/reports ('' is the business summary).
export type ReportType = 'summary' | 'orders' | 'revenue' | 'shipments' | 'returns' | 'support' | 'incidents';

export interface ReportFilters {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  groupBy: ReportGroupBy;
  timeZone: string;
}

// `period` is the first day of the bucket - the day, the Monday of the
// week, or the 1st of the month.
export type TimelineRow<K extends string> = { period: string } & Record<K, number>;

// Breakdowns are keyed by enum values (PLACED, SHIPPED, ...). The page
// only shows them, so plain strings are enough here.
export type Breakdown = Record<string, number>;

export interface OrdersReport {
  range: ReportFilters;
  totals: { orders: number; itemsSold: number; cancelled: number };
  byStatus: Breakdown;
  topProducts: { productId: string; productName: string; unitsSold: number; revenue: number }[];
  timeline: TimelineRow<'orders' | 'itemsSold'>[];
}

export interface RevenueReport {
  range: ReportFilters;
  totals: { gross: number; refunded: number; net: number; paidOrders: number; averageOrderValue: number | null };
  timeline: TimelineRow<'gross' | 'refunded' | 'net'>[];
}

export interface ShipmentsReport {
  range: ReportFilters;
  totals: {
    created: number;
    shipped: number;
    delivered: number;
    averageDaysToShip: number | null;
    averageDaysToDeliver: number | null;
  };
  byStatus: Breakdown;
  timeline: TimelineRow<'created' | 'shipped' | 'delivered'>[];
}

export interface ReturnsReport {
  range: ReportFilters;
  totals: { requested: number; returnRate: number | null; refundsCompleted: number; refundedAmount: number };
  byStatus: Breakdown;
  timeline: TimelineRow<'requested' | 'refunded'>[];
}

export interface SupportReport {
  range: ReportFilters;
  totals: { opened: number; closed: number; averageHoursToClose: number | null };
  byStatus: Breakdown;
  byPriority: Breakdown;
  byCategory: Breakdown;
  timeline: TimelineRow<'opened' | 'closed'>[];
}

export interface IncidentsReport {
  range: ReportFilters;
  totals: { opened: number; resolved: number; critical: number; averageHoursToResolve: number | null };
  byStatus: Breakdown;
  bySeverity: Breakdown;
  byType: Breakdown;
  timeline: TimelineRow<'opened' | 'resolved'>[];
}

export interface BusinessSummary {
  range: ReportFilters;
  orders: OrdersReport['totals'];
  revenue: RevenueReport['totals'];
  shipments: ShipmentsReport['totals'];
  returns: ReturnsReport['totals'];
  support: SupportReport['totals'];
  incidents: IncidentsReport['totals'];
  timeline: TimelineRow<'orders' | 'net' | 'shipped' | 'returns' | 'tickets' | 'incidents'>[];
}

// Which response type goes with which report - lets getReport() return the
// right type for the tab that asked.
export interface ReportByType {
  summary: BusinessSummary;
  orders: OrdersReport;
  revenue: RevenueReport;
  shipments: ShipmentsReport;
  returns: ReturnsReport;
  support: SupportReport;
  incidents: IncidentsReport;
}
