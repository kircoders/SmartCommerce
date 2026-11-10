'use client';

// Phase 10

// WHAT THIS FILE IS:
// What each report tab shows. They're all built from the same three
// pieces: number cards for the totals, FiguresCards for the breakdowns,
// and a TimelineSection (chart + table + CSV). Each view only decides
// which numbers go where.

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { TwoColumns } from '@/components/dashboard/DashboardShell';
import FiguresCard, { Figure } from '@/components/dashboard/FiguresCard';
import StatCards from '@/components/dashboard/StatCards';
import { formatMoney, humanize } from '@/types/dashboard';
import {
  Breakdown,
  BusinessSummary,
  IncidentsReport,
  OrdersReport,
  ReportGroupBy,
  ReturnsReport,
  RevenueReport,
  ShipmentsReport,
  SupportReport,
} from '@/types/reports';
import TimelineSection from './TimelineSection';

interface ViewProps<T> {
  data: T;
  groupBy: ReportGroupBy;
  fileName: string;
}

// { PLACED: 2, SHIPPED: 1 } -> figures labeled "Placed", "Shipped".
function toFigures(breakdown: Breakdown): Figure[] {
  return Object.entries(breakdown).map(([key, value]) => ({ label: humanize(key), value }));
}

// Averages are null when there was nothing to average.
function orDash(value: number | null, unit: string): string {
  return value === null ? '–' : `${value} ${unit}`;
}

export function SummaryView({ data, groupBy, fileName }: ViewProps<BusinessSummary>) {
  return (
    <>
      <StatCards
        cards={[
          { label: 'Orders placed', value: data.orders.orders, caption: `${data.orders.itemsSold} items sold` },
          {
            label: 'Net revenue',
            value: formatMoney(data.revenue.net),
            caption: `${formatMoney(data.revenue.gross)} sales − ${formatMoney(data.revenue.refunded)} refunded`,
          },
          { label: 'Shipped', value: data.shipments.shipped, caption: `${data.shipments.delivered} delivered` },
          {
            label: 'Returns requested',
            value: data.returns.requested,
            caption: data.returns.returnRate === null ? undefined : `${data.returns.returnRate}% return rate`,
          },
          { label: 'Tickets opened', value: data.support.opened, caption: `${data.support.closed} closed` },
          {
            label: 'Incidents',
            value: data.incidents.opened,
            color: data.incidents.critical ? 'error.main' : undefined,
            caption: `${data.incidents.critical} critical · ${data.incidents.resolved} resolved`,
          },
        ]}
      />
      <TimelineSection
        title="Activity over time"
        rows={data.timeline}
        groupBy={groupBy}
        fileName={fileName}
        columns={[
          { key: 'orders', label: 'Orders' },
          { key: 'net', label: 'Net revenue', money: true, hideOnChart: true },
          { key: 'shipped', label: 'Shipped' },
          { key: 'returns', label: 'Returns' },
          { key: 'tickets', label: 'Tickets' },
          { key: 'incidents', label: 'Incidents' },
        ]}
      />
    </>
  );
}

export function OrdersView({ data, groupBy, fileName }: ViewProps<OrdersReport>) {
  return (
    <>
      <StatCards
        cards={[
          { label: 'Orders placed', value: data.totals.orders },
          { label: 'Items sold', value: data.totals.itemsSold, caption: 'Not counting cancelled orders' },
          { label: 'Cancelled', value: data.totals.cancelled },
        ]}
      />
      <TwoColumns>
        <FiguresCard title="Orders by current status" figures={toFigures(data.byStatus)} />
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>Top products</Typography>
            {data.topProducts.length === 0 ? (
              <Typography color="text.secondary">No products sold in this range.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Units</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.topProducts.map((p) => (
                    <TableRow key={p.productId}>
                      <TableCell>{p.productName}</TableCell>
                      <TableCell align="right">{p.unitsSold}</TableCell>
                      <TableCell align="right">{formatMoney(p.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TwoColumns>
      <TimelineSection
        title="Orders over time"
        rows={data.timeline}
        groupBy={groupBy}
        fileName={fileName}
        columns={[
          { key: 'orders', label: 'Orders' },
          { key: 'itemsSold', label: 'Items sold' },
        ]}
      />
    </>
  );
}

export function RevenueView({ data, groupBy, fileName }: ViewProps<RevenueReport>) {
  return (
    <>
      <StatCards
        cards={[
          { label: 'Gross sales', value: formatMoney(data.totals.gross), caption: `${data.totals.paidOrders} orders` },
          { label: 'Refunded', value: formatMoney(data.totals.refunded) },
          { label: 'Net revenue', value: formatMoney(data.totals.net), color: 'success.main' },
          {
            label: 'Average order',
            value: data.totals.averageOrderValue === null ? '–' : formatMoney(data.totals.averageOrderValue),
          },
        ]}
      />
      <TimelineSection
        title="Revenue over time"
        rows={data.timeline}
        groupBy={groupBy}
        fileName={fileName}
        columns={[
          { key: 'gross', label: 'Gross sales', money: true },
          { key: 'refunded', label: 'Refunded', money: true },
          { key: 'net', label: 'Net', money: true },
        ]}
      />
    </>
  );
}

export function ShipmentsView({ data, groupBy, fileName }: ViewProps<ShipmentsReport>) {
  return (
    <>
      <StatCards
        cards={[
          { label: 'Created', value: data.totals.created, caption: 'New orders to fulfill' },
          {
            label: 'Shipped',
            value: data.totals.shipped,
            caption: `Avg ${orDash(data.totals.averageDaysToShip, 'days')} to ship`,
          },
          {
            label: 'Delivered',
            value: data.totals.delivered,
            caption: `Avg ${orDash(data.totals.averageDaysToDeliver, 'days')} order to door`,
          },
        ]}
      />
      <TwoColumns>
        <FiguresCard title="New shipments by current status" figures={toFigures(data.byStatus)} />
      </TwoColumns>
      <TimelineSection
        title="Shipments over time"
        rows={data.timeline}
        groupBy={groupBy}
        fileName={fileName}
        columns={[
          { key: 'created', label: 'Created' },
          { key: 'shipped', label: 'Shipped' },
          { key: 'delivered', label: 'Delivered' },
        ]}
      />
    </>
  );
}

export function ReturnsView({ data, groupBy, fileName }: ViewProps<ReturnsReport>) {
  return (
    <>
      <StatCards
        cards={[
          { label: 'Returns requested', value: data.totals.requested },
          {
            label: 'Return rate',
            value: data.totals.returnRate === null ? '–' : `${data.totals.returnRate}%`,
            caption: 'Of orders placed in this range',
          },
          { label: 'Refunds paid', value: data.totals.refundsCompleted },
          { label: 'Refunded', value: formatMoney(data.totals.refundedAmount) },
        ]}
      />
      <TwoColumns>
        <FiguresCard title="Returns by current status" figures={toFigures(data.byStatus)} />
      </TwoColumns>
      <TimelineSection
        title="Returns over time"
        rows={data.timeline}
        groupBy={groupBy}
        fileName={fileName}
        columns={[
          { key: 'requested', label: 'Requested' },
          { key: 'refunded', label: 'Refunded', money: true, hideOnChart: true },
        ]}
      />
    </>
  );
}

export function SupportView({ data, groupBy, fileName }: ViewProps<SupportReport>) {
  return (
    <>
      <StatCards
        cards={[
          { label: 'Tickets opened', value: data.totals.opened },
          { label: 'Tickets closed', value: data.totals.closed },
          { label: 'Avg time to close', value: orDash(data.totals.averageHoursToClose, 'hours') },
        ]}
      />
      <TwoColumns>
        <FiguresCard title="By current status" figures={toFigures(data.byStatus)} />
        <FiguresCard title="By category" figures={toFigures(data.byCategory)} />
      </TwoColumns>
      <TwoColumns>
        <FiguresCard title="By priority" figures={toFigures(data.byPriority)} />
      </TwoColumns>
      <TimelineSection
        title="Tickets over time"
        rows={data.timeline}
        groupBy={groupBy}
        fileName={fileName}
        columns={[
          { key: 'opened', label: 'Opened' },
          { key: 'closed', label: 'Closed' },
        ]}
      />
    </>
  );
}

export function IncidentsView({ data, groupBy, fileName }: ViewProps<IncidentsReport>) {
  return (
    <>
      <StatCards
        cards={[
          { label: 'Incidents opened', value: data.totals.opened },
          { label: 'Critical', value: data.totals.critical, color: data.totals.critical ? 'error.main' : undefined },
          { label: 'Resolved', value: data.totals.resolved, color: 'success.main' },
          { label: 'Avg time to resolve', value: orDash(data.totals.averageHoursToResolve, 'hours') },
        ]}
      />
      <TwoColumns>
        <FiguresCard title="By severity" figures={toFigures(data.bySeverity)} />
        <FiguresCard title="By type" figures={toFigures(data.byType)} />
      </TwoColumns>
      <TwoColumns>
        <FiguresCard title="By current status" figures={toFigures(data.byStatus)} />
      </TwoColumns>
      <TimelineSection
        title="Incidents over time"
        rows={data.timeline}
        groupBy={groupBy}
        fileName={fileName}
        columns={[
          { key: 'opened', label: 'Opened' },
          { key: 'resolved', label: 'Resolved' },
        ]}
      />
    </>
  );
}
