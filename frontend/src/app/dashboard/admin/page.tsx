'use client';

// Phase 1 (placeholder), filled in Phase 10

// WHAT THIS FILE IS:
// The Admin Dashboard - ADMIN only. Platform-wide totals from
// GET /api/dashboard/admin: users (and how many of each role), products,
// orders, open work (tickets, returns, incidents), and a basic system
// status check.

import Typography from '@mui/material/Typography';
import DashboardShell, { TwoColumns } from '@/components/dashboard/DashboardShell';
import FiguresCard from '@/components/dashboard/FiguresCard';
import StatCards from '@/components/dashboard/StatCards';
import SystemStatusCard from '@/components/dashboard/SystemStatusCard';
import { useDashboard } from '@/hooks/useDashboard';
import { getAdminDashboard } from '@/lib/api/dashboard';
import { humanize } from '@/types/dashboard';
import { UserRole } from '@/types/user';

export default function AdminDashboard() {
  const { user, allowed, data, error, handleLogout } = useDashboard([UserRole.ADMIN], getAdminDashboard);

  if (!user || !allowed) return null;

  const c = data?.counts;

  return (
    <DashboardShell
      title="Admin Dashboard"
      firstName={user.firstName}
      error={error}
      onLogout={handleLogout}
      links={[
        { label: 'Reports', href: '/dashboard/reports' },
        { label: 'Manage Products', href: '/dashboard/admin/products' },
        { label: 'Inventory', href: '/inventory' },
        { label: 'Shipments', href: '/dashboard/warehouse/shipments' },
        { label: 'Support Tickets', href: '/dashboard/support/tickets' },
        { label: 'Returns', href: '/dashboard/support/returns' },
        { label: 'Incidents', href: '/dashboard/incidents' },
        { label: 'Browse Products', href: '/products' },
        { label: 'My Profile', href: '/profile' },
      ]}
    >
      <StatCards
        cards={[
          { label: 'Users', value: c?.totalUsers ?? null },
          {
            label: 'Products',
            value: c?.totalProducts ?? null,
            caption: c ? `${c.activeProducts} visible in the store` : undefined,
            href: '/dashboard/admin/products',
          },
          { label: 'Orders', value: c?.totalOrders ?? null },
          { label: 'Open tickets', value: c?.openTickets ?? null, href: '/dashboard/support/tickets' },
        ]}
      />

      <Typography variant="h6" sx={{ mb: 1 }}>Needs attention</Typography>
      <StatCards
        cards={[
          {
            label: 'Returns to review',
            value: c?.returnsAwaitingReview ?? null,
            href: '/dashboard/support/returns?status=REQUESTED',
          },
          { label: 'Open incidents', value: c?.openIncidents ?? null, href: '/dashboard/incidents?status=UNRESOLVED' },
        ]}
      />

      <TwoColumns>
        <FiguresCard
          title="Users by role"
          figures={data ? Object.values(UserRole).map((r) => ({ label: humanize(r), value: data.usersByRole[r] })) : null}
        />
        {data && <SystemStatusCard status={data.systemStatus} />}
      </TwoColumns>
    </DashboardShell>
  );
}
