'use client';

// Phase 1 (placeholder), filled in Phase 10

// WHAT THIS FILE IS:
// The Customer Dashboard - what a CUSTOMER sees after logging in. One
// request to GET /api/dashboard/customer brings back only this customer's
// own data: counts for the top cards, their 5 most recent orders,
// shipments still on the way, recent returns, open support tickets, and
// basic account info. The buttons at the bottom go to the full pages.

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import DashboardShell, { TwoColumns } from '@/components/dashboard/DashboardShell';
import ListCard, { ChipColor } from '@/components/dashboard/ListCard';
import StatCards from '@/components/dashboard/StatCards';
import { useDashboard } from '@/hooks/useDashboard';
import { getCustomerDashboard } from '@/lib/api/dashboard';
import { formatMoney, humanize } from '@/types/dashboard';
import { RETURN_STATUS_COLORS, RETURN_STATUS_LABELS } from '@/types/returns';
import { STATUS_COLORS, STATUS_LABELS } from '@/types/support';
import { OrderStatus } from '@/types/order';
import { UserRole } from '@/types/user';

const ORDER_CHIP_COLORS: Record<OrderStatus, ChipColor> = {
  [OrderStatus.PLACED]: 'info',
  [OrderStatus.PROCESSING]: 'info',
  [OrderStatus.SHIPPED]: 'warning',
  [OrderStatus.DELIVERED]: 'success',
  [OrderStatus.CANCELLED]: 'default',
};

const shortId = (id: string) => `#${id.slice(0, 8)}`;

export default function CustomerDashboard() {
  const { user, allowed, data, error, handleLogout } = useDashboard([UserRole.CUSTOMER], getCustomerDashboard);

  if (!user || !allowed) return null;

  return (
    <DashboardShell
      title="Customer Dashboard"
      firstName={user.firstName}
      error={error}
      onLogout={handleLogout}
      links={[
        { label: 'Browse Products', href: '/products' },
        { label: 'My Cart', href: '/cart' },
        { label: 'My Orders', href: '/orders' },
        { label: 'My Returns', href: '/returns' },
        { label: 'My Support Tickets', href: '/support' },
        { label: 'Contact Support', href: '/support/new' },
        { label: 'My Profile', href: '/profile' },
      ]}
    >
      <StatCards
        cards={[
          { label: 'Orders', value: data?.counts.totalOrders ?? null, href: '/orders' },
          { label: 'On the way', value: data?.counts.activeShipments ?? null, href: '/orders' },
          { label: 'Open returns', value: data?.counts.openReturns ?? null, href: '/returns' },
          { label: 'Open tickets', value: data?.counts.openTickets ?? null, href: '/support' },
        ]}
      />

      <TwoColumns>
        <ListCard
          title="Recent orders"
          emptyText="You haven't placed any orders yet."
          action={{ label: 'View all', href: '/orders' }}
          rows={
            data?.recentOrders.map((o) => ({
              key: o.id,
              primary: `Order ${shortId(o.id)} · ${formatMoney(o.totalAmount)}`,
              secondary: new Date(o.createdAt).toLocaleDateString(),
              chip: { label: humanize(o.status), color: ORDER_CHIP_COLORS[o.status] },
              href: '/orders',
            })) ?? null
          }
        />
        <ListCard
          title="On the way"
          emptyText="Nothing on the way right now."
          rows={
            data?.activeShipments.map((s) => ({
              key: s.id,
              primary: `Order ${shortId(s.orderId)}`,
              secondary: s.trackingNumber ? `Tracking: ${s.trackingNumber}` : 'Tracking number coming soon',
              chip: { label: humanize(s.status), color: 'info' },
              href: '/orders',
            })) ?? null
          }
        />
      </TwoColumns>

      <TwoColumns>
        <ListCard
          title="Returns"
          emptyText="No return requests."
          action={{ label: 'View all', href: '/returns' }}
          rows={
            data?.returns.map((r) => ({
              key: r.id,
              primary: `Return for order ${shortId(r.orderId)}`,
              secondary: `Requested ${new Date(r.requestedAt).toLocaleDateString()}`,
              chip: { label: RETURN_STATUS_LABELS[r.status], color: RETURN_STATUS_COLORS[r.status] },
              href: `/returns/detail?id=${r.id}`,
            })) ?? null
          }
        />
        <ListCard
          title="Open support tickets"
          emptyText="No open tickets."
          action={{ label: 'View all', href: '/support' }}
          rows={
            data?.openTickets.map((t) => ({
              key: t.id,
              primary: t.subject,
              secondary: `Updated ${new Date(t.updatedAt).toLocaleDateString()}`,
              chip: { label: STATUS_LABELS[t.status], color: STATUS_COLORS[t.status] },
              href: `/support/ticket?id=${t.id}`,
            })) ?? null
          }
        />
      </TwoColumns>

      {data && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>Account</Typography>
            <Typography>{data.account.firstName} {data.account.lastName}</Typography>
            <Typography color="text.secondary">{data.account.email}</Typography>
            <Typography variant="body2" color="text.secondary">
              Member since {new Date(data.account.memberSince).toLocaleDateString()}
            </Typography>
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}
