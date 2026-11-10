'use client';

// Phase 1 (placeholder), Phase 9 (incident cards), filled in Phase 10

// WHAT THIS FILE IS:
// The Operations Dashboard - OPERATIONS_MANAGER and ADMIN. The business at
// a glance, from GET /api/dashboard/operations: total orders and revenue,
// pending work in every area (shipments, tickets, returns, incidents), low
// stock, orders by status, and a basic system status check.
//
// The incident cards from Phase 9 stay as their own row, so the dashboard
// also loads GET /api/incidents/summary for "resolved this week". Open and
// Critical still link to the Incidents page with that filter applied.

import Typography from '@mui/material/Typography';
import DashboardShell, { TwoColumns } from '@/components/dashboard/DashboardShell';
import FiguresCard from '@/components/dashboard/FiguresCard';
import ListCard from '@/components/dashboard/ListCard';
import StatCards from '@/components/dashboard/StatCards';
import SystemStatusCard from '@/components/dashboard/SystemStatusCard';
import { useDashboard } from '@/hooks/useDashboard';
import { getOperationsDashboard } from '@/lib/api/dashboard';
import { getIncidentSummary } from '@/lib/api/incidents';
import { INCIDENT_ROLES } from '@/lib/dashboard-routes';
import { formatMoney, humanize } from '@/types/dashboard';
import { OrderStatus } from '@/types/order';

async function loadOperations(token: string) {
  const [dashboard, incidents] = await Promise.all([getOperationsDashboard(token), getIncidentSummary(token)]);
  return { dashboard, incidents };
}

export default function OperationsDashboard() {
  const { user, allowed, data, error, handleLogout } = useDashboard(INCIDENT_ROLES, loadOperations);

  if (!user || !allowed) return null;

  const d = data?.dashboard;
  const critical = d?.counts.criticalIncidents ?? null;
  const lowStock = d?.counts.lowStockProducts ?? null;

  return (
    <DashboardShell
      title="Operations Dashboard"
      firstName={user.firstName}
      error={error}
      onLogout={handleLogout}
      links={[
        { label: 'Reports', href: '/dashboard/reports' },
        { label: 'Shipments', href: '/dashboard/warehouse/shipments' },
        { label: 'Inventory', href: '/inventory' },
        { label: 'Support Tickets', href: '/dashboard/support/tickets' },
        { label: 'Returns', href: '/dashboard/support/returns' },
        { label: 'Incidents', href: '/dashboard/incidents' },
        { label: 'Browse Products', href: '/products' },
      ]}
    >
      <StatCards
        cards={[
          { label: 'Total orders', value: d?.counts.totalOrders ?? null },
          {
            label: 'Net revenue',
            value: d ? formatMoney(d.revenue.net) : null,
            caption: d ? `${formatMoney(d.revenue.gross)} sales − ${formatMoney(d.revenue.refunded)} refunded` : undefined,
          },
          { label: 'Pending shipments', value: d?.counts.pendingShipments ?? null, href: '/dashboard/warehouse/shipments' },
          { label: 'Open tickets', value: d?.counts.openTickets ?? null, href: '/dashboard/support/tickets' },
          {
            label: 'Returns to review',
            value: d?.counts.returnsAwaitingReview ?? null,
            href: '/dashboard/support/returns?status=REQUESTED',
          },
          {
            label: 'Returns to refund',
            value: d?.counts.returnsAwaitingRefund ?? null,
            caption: 'Received back, not refunded',
            href: '/dashboard/support/returns?status=RECEIVED',
          },
          {
            label: 'Low stock',
            value: lowStock,
            color: lowStock ? 'warning.main' : undefined,
            href: '/inventory',
          },
        ]}
      />

      <Typography variant="h6" sx={{ mb: 1 }}>Incidents</Typography>
      <StatCards
        cards={[
          { label: 'Open', value: data?.incidents.open ?? null, href: '/dashboard/incidents?status=UNRESOLVED' },
          {
            label: 'Critical',
            value: critical,
            color: critical ? 'error.main' : undefined,
            href: '/dashboard/incidents?status=UNRESOLVED&severity=CRITICAL',
          },
          { label: 'Resolved this week', value: data?.incidents.recentlyResolved ?? null, color: 'success.main' },
        ]}
      />

      <TwoColumns>
        <FiguresCard
          title="Orders by status"
          figures={d ? Object.values(OrderStatus).map((s) => ({ label: humanize(s), value: d.ordersByStatus[s] })) : null}
        />
        <ListCard
          title="Low stock alerts"
          emptyText="Every product is above its low-stock level."
          action={{ label: 'Inventory', href: '/inventory' }}
          rows={
            d?.lowStock.map((item) => ({
              key: item.productId,
              primary: item.productName,
              secondary: `${item.quantityAvailable} available · alert at ${item.lowStockThreshold}`,
              chip:
                item.quantityAvailable === 0
                  ? { label: 'Out of stock', color: 'error' as const }
                  : { label: 'Low', color: 'warning' as const },
              href: `/inventory/edit?id=${item.productId}`,
            })) ?? null
          }
        />
      </TwoColumns>

      {d && <SystemStatusCard status={d.systemStatus} />}
    </DashboardShell>
  );
}
