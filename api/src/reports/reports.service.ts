// Phase 10

// WHAT THIS FILE IS:
// The business reports for operations managers and admins. Like the
// dashboards, nothing here changes data - it only reads and adds up. The
// difference is that every report covers a DATE RANGE the manager picks,
// and comes with a timeline: the same numbers broken down per day, week,
// or month.
//
// Which date counts? Each number uses the date the thing it measures
// happened:
//   orders placed     -> orders.created_at
//   refunds paid      -> refunds.processed_at
//   shipments shipped -> shipments.shipped_date (delivered -> delivered_date)
//   returns requested -> returns.requested_at
//   tickets closed    -> support_tickets.closed_at
//   incidents resolved-> incidents.resolved_at
// So "shipped this week" includes an order placed last week that went out
// on Monday.

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import {
  IncidentEntity,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
} from '../incidents/entities/incident.entity';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { OrderEntity, OrderStatus } from '../orders/entities/order.entity';
import { RefundEntity, RefundStatus } from '../returns/entities/refund.entity';
import { ReturnEntity, ReturnStatus } from '../returns/entities/return.entity';
import {
  ShipmentEntity,
  ShipmentStatus,
} from '../shipments/entities/shipment.entity';
import {
  SupportTicketEntity,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../support/entities/support-ticket.entity';
import { ReportGroupBy, ReportQueryDto } from './dto/report-query.dto';
import {
  BusinessSummary,
  IncidentsReport,
  OrdersReport,
  ReportRange,
  ReturnsReport,
  RevenueReport,
  ShipmentsReport,
  SupportReport,
  TimelineRow,
} from './reports.types';

const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 731; // two years
const TOP_PRODUCTS_LIMIT = 5;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;

// The range in SQL. `from` and `to` are calendar days in the manager's
// time zone, so "Nov 9" means midnight Nov 9 to midnight Nov 10 THERE.
//   CAST(:from AS date)          '2026-11-09' -> a date
//   ... AS timestamp             -> 2026-11-09 00:00 (no zone yet)
//   AT TIME ZONE :tz             -> "that midnight, in New York" = an exact moment
// `to` adds 1 day and uses `<`, so the whole last day is included.
const RANGE_START = 'CAST(CAST(:from AS date) AS timestamp) AT TIME ZONE :tz';
const RANGE_END = 'CAST(CAST(:to AS date) + 1 AS timestamp) AT TIME ZONE :tz';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepo: Repository<OrderItemEntity>,
    @InjectRepository(RefundEntity)
    private readonly refundRepo: Repository<RefundEntity>,
    @InjectRepository(ShipmentEntity)
    private readonly shipmentRepo: Repository<ShipmentEntity>,
    @InjectRepository(ReturnEntity)
    private readonly returnRepo: Repository<ReturnEntity>,
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
    @InjectRepository(IncidentEntity)
    private readonly incidentRepo: Repository<IncidentEntity>,
  ) {}

  // ---------- GET /api/reports - the business summary ----------

  // Runs every report and keeps the headline numbers. The timelines all
  // use the same periods, so row i of each one is the same day/week/month.
  async getSummary(query: ReportQueryDto): Promise<BusinessSummary> {
    const range = this.resolveRange(query);
    const [orders, revenue, shipments, returns, support, incidents] =
      await Promise.all([
        this.getOrders(query),
        this.getRevenue(query),
        this.getShipments(query),
        this.getReturns(query),
        this.getSupport(query),
        this.getIncidents(query),
      ]);

    return {
      range,
      orders: orders.totals,
      revenue: revenue.totals,
      shipments: shipments.totals,
      returns: returns.totals,
      support: support.totals,
      incidents: incidents.totals,
      timeline: orders.timeline.map((row, i) => ({
        period: row.period,
        orders: row.orders,
        net: revenue.timeline[i].net,
        shipped: shipments.timeline[i].shipped,
        returns: returns.timeline[i].requested,
        tickets: support.timeline[i].opened,
        incidents: incidents.timeline[i].opened,
      })),
    };
  }

  // ---------- Orders ----------

  async getOrders(query: ReportQueryDto): Promise<OrdersReport> {
    const range = this.resolveRange(query);

    const [
      totals,
      itemsSold,
      byStatus,
      topProducts,
      perPeriod,
      itemsPerPeriod,
    ] = await Promise.all([
      this.inRange(
        this.orderRepo.createQueryBuilder('o'),
        'o.created_at',
        range,
      )
        .select('COUNT(*)', 'orders')
        .addSelect(
          "COUNT(*) FILTER (WHERE o.status = 'CANCELLED')",
          'cancelled',
        )
        .getRawOne<{ orders: string; cancelled: string }>(),
      // Units sold comes from order_items, but the date is on the order -
      // join to it. Cancelled orders didn't sell anything.
      this.inRange(this.itemsOfPaidOrders(), 'o.created_at', range)
        .select('COALESCE(SUM(oi.quantity), 0)', 'units')
        .getRawOne<{ units: string }>(),
      this.countBy(
        this.inRange(
          this.orderRepo.createQueryBuilder('o'),
          'o.created_at',
          range,
        ),
        'o.status',
        Object.values(OrderStatus),
      ),
      // Grouped by product. The name comes from the order item (the
      // name at the time of the order, same as on the receipt).
      this.inRange(this.itemsOfPaidOrders(), 'o.created_at', range)
        .select('oi.product_id', 'productId')
        .addSelect('MAX(oi.product_name)', 'productName')
        .addSelect('SUM(oi.quantity)', 'unitsSold')
        .addSelect('SUM(oi.quantity * oi.unit_price)', 'revenue')
        .groupBy('oi.product_id')
        .orderBy('SUM(oi.quantity)', 'DESC')
        .limit(TOP_PRODUCTS_LIMIT)
        .getRawMany<{
          productId: string;
          productName: string;
          unitsSold: string;
          revenue: string;
        }>(),
      this.perPeriod(
        this.orderRepo.createQueryBuilder('o'),
        'o.created_at',
        range,
        {
          orders: 'COUNT(*)',
        },
      ),
      this.perPeriod(this.itemsOfPaidOrders(), 'o.created_at', range, {
        itemsSold: 'SUM(oi.quantity)',
      }),
    ]);

    return {
      range,
      totals: {
        orders: toNumber(totals?.orders),
        itemsSold: toNumber(itemsSold?.units),
        cancelled: toNumber(totals?.cancelled),
      },
      byStatus,
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        productName: p.productName,
        unitsSold: toNumber(p.unitsSold),
        revenue: roundMoney(toNumber(p.revenue)),
      })),
      timeline: buildTimeline(
        range,
        ['orders', 'itemsSold'],
        [perPeriod, itemsPerPeriod],
      ),
    };
  }

  // ---------- Revenue ----------

  // Gross = orders placed in the range that weren't cancelled (same rule
  // as the operations dashboard). Refunded = refunds paid out in the range.
  async getRevenue(query: ReportQueryDto): Promise<RevenueReport> {
    const range = this.resolveRange(query);

    const [sales, refunds, salesPerPeriod, refundsPerPeriod] =
      await Promise.all([
        this.inRange(this.paidOrders(), 'o.created_at', range)
          .select('COALESCE(SUM(o.total_amount), 0)', 'gross')
          .addSelect('COUNT(*)', 'orders')
          .getRawOne<{ gross: string; orders: string }>(),
        this.inRange(this.completedRefunds(), 'r.processed_at', range)
          .select('COALESCE(SUM(r.amount), 0)', 'refunded')
          .getRawOne<{ refunded: string }>(),
        this.perPeriod(this.paidOrders(), 'o.created_at', range, {
          gross: 'SUM(o.total_amount)',
        }),
        this.perPeriod(this.completedRefunds(), 'r.processed_at', range, {
          refunded: 'SUM(r.amount)',
        }),
      ]);

    const gross = toNumber(sales?.gross);
    const refunded = toNumber(refunds?.refunded);
    const paidOrders = toNumber(sales?.orders);

    return {
      range,
      totals: {
        gross,
        refunded,
        net: roundMoney(gross - refunded),
        paidOrders,
        averageOrderValue: paidOrders ? roundMoney(gross / paidOrders) : null,
      },
      timeline: buildTimeline(
        range,
        ['gross', 'refunded'],
        [salesPerPeriod, refundsPerPeriod],
      ).map((row) => ({ ...row, net: roundMoney(row.gross - row.refunded) })),
    };
  }

  // ---------- Shipments ----------

  async getShipments(query: ReportQueryDto): Promise<ShipmentsReport> {
    const range = this.resolveRange(query);

    const [
      created,
      byStatus,
      shipped,
      delivered,
      createdPer,
      shippedPer,
      deliveredPer,
    ] = await Promise.all([
      this.inRange(
        this.shipmentRepo.createQueryBuilder('s'),
        's.created_at',
        range,
      ).getCount(),
      this.countBy(
        this.inRange(
          this.shipmentRepo.createQueryBuilder('s'),
          's.created_at',
          range,
        ),
        's.status',
        Object.values(ShipmentStatus),
      ),
      // EXTRACT(EPOCH FROM a - b) = the gap between two timestamps in
      // seconds, so AVG of it / 86400 = average days.
      this.inRange(
        this.shipmentRepo.createQueryBuilder('s'),
        's.shipped_date',
        range,
      )
        .select('COUNT(*)', 'count')
        .addSelect(
          'AVG(EXTRACT(EPOCH FROM (s.shipped_date - s.created_at)))',
          'avgSeconds',
        )
        .getRawOne<{ count: string; avgSeconds: string | null }>(),
      this.inRange(
        this.shipmentRepo.createQueryBuilder('s'),
        's.delivered_date',
        range,
      )
        .select('COUNT(*)', 'count')
        .addSelect(
          'AVG(EXTRACT(EPOCH FROM (s.delivered_date - s.created_at)))',
          'avgSeconds',
        )
        .getRawOne<{ count: string; avgSeconds: string | null }>(),
      this.perPeriod(
        this.shipmentRepo.createQueryBuilder('s'),
        's.created_at',
        range,
        {
          created: 'COUNT(*)',
        },
      ),
      this.perPeriod(
        this.shipmentRepo.createQueryBuilder('s'),
        's.shipped_date',
        range,
        {
          shipped: 'COUNT(*)',
        },
      ),
      this.perPeriod(
        this.shipmentRepo.createQueryBuilder('s'),
        's.delivered_date',
        range,
        {
          delivered: 'COUNT(*)',
        },
      ),
    ]);

    return {
      range,
      totals: {
        created,
        shipped: toNumber(shipped?.count),
        delivered: toNumber(delivered?.count),
        averageDaysToShip: average(shipped?.avgSeconds, SECONDS_PER_DAY),
        averageDaysToDeliver: average(delivered?.avgSeconds, SECONDS_PER_DAY),
      },
      byStatus,
      timeline: buildTimeline(
        range,
        ['created', 'shipped', 'delivered'],
        [createdPer, shippedPer, deliveredPer],
      ),
    };
  }

  // ---------- Returns ----------

  async getReturns(query: ReportQueryDto): Promise<ReturnsReport> {
    const range = this.resolveRange(query);

    const [requested, orders, byStatus, refunds, requestedPer, refundedPer] =
      await Promise.all([
        this.inRange(
          this.returnRepo.createQueryBuilder('rt'),
          'rt.requested_at',
          range,
        ).getCount(),
        // For the return rate: orders placed in the range, and how many of
        // THOSE orders have a return (at any time since). Counting the
        // orders' own returns keeps the rate between 0% and 100%.
        this.inRange(
          this.orderRepo.createQueryBuilder('o'),
          'o.created_at',
          range,
        )
          .select('COUNT(*)', 'placed')
          .addSelect(
            'COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM returns x WHERE x.order_id = o.id))',
            'returned',
          )
          .getRawOne<{ placed: string; returned: string }>(),
        this.countBy(
          this.inRange(
            this.returnRepo.createQueryBuilder('rt'),
            'rt.requested_at',
            range,
          ),
          'rt.status',
          Object.values(ReturnStatus),
        ),
        this.inRange(this.completedRefunds(), 'r.processed_at', range)
          .select('COUNT(*)', 'count')
          .addSelect('COALESCE(SUM(r.amount), 0)', 'amount')
          .getRawOne<{ count: string; amount: string }>(),
        this.perPeriod(
          this.returnRepo.createQueryBuilder('rt'),
          'rt.requested_at',
          range,
          {
            requested: 'COUNT(*)',
          },
        ),
        this.perPeriod(this.completedRefunds(), 'r.processed_at', range, {
          refunded: 'SUM(r.amount)',
        }),
      ]);

    return {
      range,
      totals: {
        requested,
        returnRate: toNumber(orders?.placed)
          ? Math.round(
              (toNumber(orders?.returned) / toNumber(orders?.placed)) * 1000,
            ) / 10
          : null,
        refundsCompleted: toNumber(refunds?.count),
        refundedAmount: roundMoney(toNumber(refunds?.amount)),
      },
      byStatus,
      timeline: buildTimeline(
        range,
        ['requested', 'refunded'],
        [requestedPer, refundedPer],
      ),
    };
  }

  // ---------- Support ----------

  async getSupport(query: ReportQueryDto): Promise<SupportReport> {
    const range = this.resolveRange(query);
    const opened = () =>
      this.inRange(
        this.ticketRepo.createQueryBuilder('t'),
        't.created_at',
        range,
      );

    const [
      openedCount,
      byStatus,
      byPriority,
      byCategory,
      closed,
      openedPer,
      closedPer,
    ] = await Promise.all([
      opened().getCount(),
      this.countBy(opened(), 't.status', Object.values(TicketStatus)),
      this.countBy(opened(), 't.priority', Object.values(TicketPriority)),
      this.countBy(opened(), 't.category', Object.values(TicketCategory)),
      this.inRange(
        this.ticketRepo.createQueryBuilder('t'),
        't.closed_at',
        range,
      )
        .select('COUNT(*)', 'count')
        .addSelect(
          'AVG(EXTRACT(EPOCH FROM (t.closed_at - t.created_at)))',
          'avgSeconds',
        )
        .getRawOne<{ count: string; avgSeconds: string | null }>(),
      this.perPeriod(
        this.ticketRepo.createQueryBuilder('t'),
        't.created_at',
        range,
        {
          opened: 'COUNT(*)',
        },
      ),
      this.perPeriod(
        this.ticketRepo.createQueryBuilder('t'),
        't.closed_at',
        range,
        {
          closed: 'COUNT(*)',
        },
      ),
    ]);

    return {
      range,
      totals: {
        opened: openedCount,
        closed: toNumber(closed?.count),
        averageHoursToClose: average(closed?.avgSeconds, SECONDS_PER_HOUR),
      },
      byStatus,
      byPriority,
      byCategory,
      timeline: buildTimeline(
        range,
        ['opened', 'closed'],
        [openedPer, closedPer],
      ),
    };
  }

  // ---------- Incidents ----------

  async getIncidents(query: ReportQueryDto): Promise<IncidentsReport> {
    const range = this.resolveRange(query);
    const opened = () =>
      this.inRange(
        this.incidentRepo.createQueryBuilder('i'),
        'i.created_at',
        range,
      );

    const [
      counts,
      byStatus,
      bySeverity,
      byType,
      resolved,
      openedPer,
      resolvedPer,
    ] = await Promise.all([
      opened()
        .select('COUNT(*)', 'opened')
        .addSelect('COUNT(*) FILTER (WHERE i.severity = :critical)', 'critical')
        .setParameter('critical', IncidentSeverity.CRITICAL)
        .getRawOne<{ opened: string; critical: string }>(),
      this.countBy(opened(), 'i.status', Object.values(IncidentStatus)),
      this.countBy(opened(), 'i.severity', Object.values(IncidentSeverity)),
      this.countBy(opened(), 'i.type', Object.values(IncidentType)),
      // A reopened incident has its resolved_at cleared, so it only
      // counts here once it's resolved again.
      this.inRange(
        this.incidentRepo.createQueryBuilder('i'),
        'i.resolved_at',
        range,
      )
        .select('COUNT(*)', 'count')
        .addSelect(
          'AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.created_at)))',
          'avgSeconds',
        )
        .getRawOne<{ count: string; avgSeconds: string | null }>(),
      this.perPeriod(
        this.incidentRepo.createQueryBuilder('i'),
        'i.created_at',
        range,
        {
          opened: 'COUNT(*)',
        },
      ),
      this.perPeriod(
        this.incidentRepo.createQueryBuilder('i'),
        'i.resolved_at',
        range,
        {
          resolved: 'COUNT(*)',
        },
      ),
    ]);

    return {
      range,
      totals: {
        opened: toNumber(counts?.opened),
        resolved: toNumber(resolved?.count),
        critical: toNumber(counts?.critical),
        averageHoursToResolve: average(resolved?.avgSeconds, SECONDS_PER_HOUR),
      },
      byStatus,
      bySeverity,
      byType,
      timeline: buildTimeline(
        range,
        ['opened', 'resolved'],
        [openedPer, resolvedPer],
      ),
    };
  }

  // ---------- Building blocks ----------

  // Fills in the defaults and checks the range makes sense.
  resolveRange(query: ReportQueryDto): ReportRange {
    const timeZone = query.timeZone ?? 'UTC';
    const to = query.to ?? todayIn(timeZone);
    const from = query.from ?? addDays(to, -(DEFAULT_RANGE_DAYS - 1));

    if (from > to) {
      throw new BadRequestException('"from" must be on or before "to"');
    }
    if (daysBetween(from, to) + 1 > MAX_RANGE_DAYS) {
      throw new BadRequestException('Pick a date range of 2 years or less');
    }
    return { from, to, groupBy: query.groupBy ?? ReportGroupBy.DAY, timeZone };
  }

  // Adds "column is inside the range" to any query.
  private inRange<E extends ObjectLiteral>(
    qb: SelectQueryBuilder<E>,
    column: string,
    range: ReportRange,
  ): SelectQueryBuilder<E> {
    return qb.andWhere(
      `${column} >= ${RANGE_START} AND ${column} < ${RANGE_END}`,
      {
        from: range.from,
        to: range.to,
        tz: range.timeZone,
      },
    );
  }

  private paidOrders(): SelectQueryBuilder<OrderEntity> {
    return this.orderRepo
      .createQueryBuilder('o')
      .where('o.status <> :cancelled', { cancelled: OrderStatus.CANCELLED });
  }

  private itemsOfPaidOrders(): SelectQueryBuilder<OrderItemEntity> {
    return this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .where('o.status <> :cancelled', { cancelled: OrderStatus.CANCELLED });
  }

  private completedRefunds(): SelectQueryBuilder<RefundEntity> {
    return this.refundRepo
      .createQueryBuilder('r')
      .where('r.status = :completed', { completed: RefundStatus.COMPLETED });
  }

  // SELECT status, COUNT(*) ... GROUP BY status, with every possible value
  // starting at 0 (Postgres only returns the values that have rows).
  // Same idea as the dashboard's countByColumn.
  private async countBy<E extends ObjectLiteral, T extends string>(
    qb: SelectQueryBuilder<E>,
    column: string,
    values: T[],
  ): Promise<Record<T, number>> {
    const rows = await qb
      .select(column, 'value')
      .addSelect('COUNT(*)', 'count')
      .groupBy(column)
      .getRawMany<{ value: string; count: string }>();

    const counts = Object.fromEntries(values.map((v) => [v, 0])) as Record<
      T,
      number
    >;
    for (const row of rows) {
      if (row.value in counts) counts[row.value as T] = Number(row.count);
    }
    return counts;
  }

  // The timeline query. For groupBy=week it's roughly:
  //   SELECT to_char(date_trunc('week', created_at AT TIME ZONE 'America/New_York'), 'YYYY-MM-DD') AS period,
  //          COUNT(*) AS orders
  //   FROM orders WHERE <in range> GROUP BY period
  // date_trunc rounds each timestamp DOWN to the start of its day/week/month,
  // so every order in the same week lands in the same group.
  private async perPeriod<E extends ObjectLiteral, K extends string>(
    qb: SelectQueryBuilder<E>,
    column: string,
    range: ReportRange,
    measures: Record<K, string>,
  ): Promise<Map<string, Record<K, number>>> {
    qb.select(
      `to_char(date_trunc(:unit, ${column} AT TIME ZONE :tz), 'YYYY-MM-DD')`,
      'period',
    ).setParameter('unit', range.groupBy);
    const keys = Object.keys(measures) as K[];
    for (const key of keys) qb.addSelect(measures[key], key);

    const rows = await this.inRange(qb, column, range)
      .groupBy('period')
      .getRawMany<{ period: string } & Record<K, string>>();

    const byPeriod = new Map<string, Record<K, number>>();
    for (const row of rows) {
      const values = {} as Record<K, number>;
      for (const key of keys) values[key] = toNumber(row[key]);
      byPeriod.set(row.period, values);
    }
    return byPeriod;
  }
}

// ---------- Date helpers (plain calendar days as 'YYYY-MM-DD') ----------

// The calendar date right now in that time zone. 'en-CA' formats dates as
// YYYY-MM-DD.
function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

// Calendar math done in UTC so no daylight-saving shift can move the day.
function parseDay(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(day: string, n: number): string {
  const d = parseDay(day);
  d.setUTCDate(d.getUTCDate() + n);
  return formatDay(d);
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (parseDay(to).getTime() - parseDay(from).getTime()) /
      (SECONDS_PER_DAY * 1000),
  );
}

// Every period in the range, in order, matching what date_trunc returns:
// day -> each day; week -> each Monday; month -> each 1st.
function listPeriods(range: ReportRange): string[] {
  const start = parseDay(range.from);
  if (range.groupBy === ReportGroupBy.WEEK) {
    // getUTCDay: Sunday 0 ... Saturday 6. Step back to Monday.
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  } else if (range.groupBy === ReportGroupBy.MONTH) {
    start.setUTCDate(1);
  }

  const periods: string[] = [];
  const end = parseDay(range.to);
  for (const d = start; d <= end;) {
    periods.push(formatDay(d));
    if (range.groupBy === ReportGroupBy.DAY) d.setUTCDate(d.getUTCDate() + 1);
    else if (range.groupBy === ReportGroupBy.WEEK)
      d.setUTCDate(d.getUTCDate() + 7);
    else d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return periods;
}

// One row per period, with 0 for days nothing happened (so the chart has
// no gaps), merging the numbers from each per-period query.
function buildTimeline<K extends string>(
  range: ReportRange,
  keys: K[],
  sources: Map<string, Partial<Record<K, number>>>[],
): TimelineRow<K>[] {
  return listPeriods(range).map((period) => {
    const row = { period } as TimelineRow<K>;
    for (const key of keys) {
      let value = 0;
      for (const source of sources) value += source.get(period)?.[key] ?? 0;
      (row as Record<K, number>)[key] = value;
    }
    return row;
  });
}

// ---------- Number helpers ----------

// COUNT, SUM, and numeric columns arrive from Postgres as strings.
function toNumber(value: string | number | null | undefined): number {
  return value === null || value === undefined ? 0 : Number(value);
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

// AVG of nothing is NULL - "no average" rather than 0.
function average(
  seconds: string | null | undefined,
  unit: number,
): number | null {
  if (seconds === null || seconds === undefined) return null;
  return Math.round((Number(seconds) / unit) * 10) / 10;
}
