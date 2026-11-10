// Phase 10

// WHAT THIS FILE IS:
// The shape of every report the API sends back. Each report covers one
// date range and has the same three parts:
//   totals    - the headline numbers for the whole range
//   by...     - breakdowns (e.g. how many of those orders are in each status)
//   timeline  - one row per day/week/month, for the table and the chart

import {
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
} from '../incidents/entities/incident.entity';
import { OrderStatus } from '../orders/entities/order.entity';
import { ReturnStatus } from '../returns/entities/return.entity';
import { ShipmentStatus } from '../shipments/entities/shipment.entity';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../support/entities/support-ticket.entity';
import { ReportGroupBy } from './dto/report-query.dto';

export interface ReportRange {
  from: string; // YYYY-MM-DD, included
  to: string; // YYYY-MM-DD, included
  groupBy: ReportGroupBy;
  timeZone: string;
}

// `period` is the first day of the bucket: the day itself, the Monday of
// the week, or the 1st of the month.
export type TimelineRow<K extends string> = { period: string } & Record<
  K,
  number
>;

export interface OrdersReport {
  range: ReportRange;
  totals: { orders: number; itemsSold: number; cancelled: number };
  // Orders placed in the range, by the status they're in now.
  byStatus: Record<OrderStatus, number>;
  topProducts: {
    productId: string;
    productName: string;
    unitsSold: number;
    revenue: number;
  }[];
  timeline: TimelineRow<'orders' | 'itemsSold'>[];
}

export interface RevenueReport {
  range: ReportRange;
  totals: {
    gross: number;
    refunded: number;
    net: number;
    paidOrders: number;
    averageOrderValue: number | null;
  };
  timeline: TimelineRow<'gross' | 'refunded' | 'net'>[];
}

export interface ShipmentsReport {
  range: ReportRange;
  totals: {
    created: number;
    shipped: number;
    delivered: number;
    averageDaysToShip: number | null;
    averageDaysToDeliver: number | null;
  };
  byStatus: Record<ShipmentStatus, number>;
  timeline: TimelineRow<'created' | 'shipped' | 'delivered'>[];
}

export interface ReturnsReport {
  range: ReportRange;
  totals: {
    requested: number;
    // Of the orders placed in the range, the percent that have a return.
    returnRate: number | null;
    refundsCompleted: number;
    refundedAmount: number;
  };
  byStatus: Record<ReturnStatus, number>;
  timeline: TimelineRow<'requested' | 'refunded'>[];
}

export interface SupportReport {
  range: ReportRange;
  totals: {
    opened: number;
    closed: number;
    averageHoursToClose: number | null;
  };
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<TicketPriority, number>;
  byCategory: Record<TicketCategory, number>;
  timeline: TimelineRow<'opened' | 'closed'>[];
}

export interface IncidentsReport {
  range: ReportRange;
  totals: {
    opened: number;
    resolved: number;
    critical: number;
    averageHoursToResolve: number | null;
  };
  byStatus: Record<IncidentStatus, number>;
  bySeverity: Record<IncidentSeverity, number>;
  byType: Record<IncidentType, number>;
  timeline: TimelineRow<'opened' | 'resolved'>[];
}

// GET /api/reports - the headline numbers from every report on one page.
export interface BusinessSummary {
  range: ReportRange;
  orders: OrdersReport['totals'];
  revenue: RevenueReport['totals'];
  shipments: ShipmentsReport['totals'];
  returns: ReturnsReport['totals'];
  support: SupportReport['totals'];
  incidents: IncidentsReport['totals'];
  timeline: TimelineRow<
    'orders' | 'net' | 'shipped' | 'returns' | 'tickets' | 'incidents'
  >[];
}
