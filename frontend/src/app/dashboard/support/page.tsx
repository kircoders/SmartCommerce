'use client';

// Phase 7, filled in Phase 10

// WHAT THIS FILE IS:
// The Support Dashboard - SUPPORT_AGENT (plus OPERATIONS_MANAGER and ADMIN,
// same as the other support screens). Phase 7 loaded the whole ticket
// queue just to count it; now one request to GET /api/dashboard/support
// brings back the counts, the workload summary (open tickets by status and
// priority), tickets assigned to the logged-in agent, and the most
// recently updated tickets. Number cards link to the ticket queue with
// that filter already applied.

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import DashboardShell, { TwoColumns } from '@/components/dashboard/DashboardShell';
import ListCard, { ListRow } from '@/components/dashboard/ListCard';
import StatCards from '@/components/dashboard/StatCards';
import { useDashboard } from '@/hooks/useDashboard';
import { getSupportDashboard } from '@/lib/api/dashboard';
import { SUPPORT_STAFF_ROLES } from '@/lib/dashboard-routes';
import { TicketSummaryRow, humanize } from '@/types/dashboard';
import { PRIORITY_COLORS, STATUS_COLORS, STATUS_LABELS, TicketPriority, TicketStatus } from '@/types/support';

// Only the statuses that still need work - resolved and closed tickets
// aren't workload.
const OPEN_STATUSES = [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_CUSTOMER];

function toRow(t: TicketSummaryRow): ListRow {
  return {
    key: t.id,
    primary: t.subject,
    secondary: `${humanize(t.priority)} priority · updated ${new Date(t.updatedAt).toLocaleString()}`,
    chip: { label: STATUS_LABELS[t.status], color: STATUS_COLORS[t.status] },
    href: `/dashboard/support/tickets/detail?id=${t.id}`,
  };
}

export default function SupportDashboard() {
  const { user, allowed, data, error, handleLogout } = useDashboard(SUPPORT_STAFF_ROLES, getSupportDashboard);

  if (!user || !allowed) return null;

  return (
    <DashboardShell
      title="Support Dashboard"
      firstName={user.firstName}
      error={error}
      onLogout={handleLogout}
      links={[
        { label: 'Support Tickets', href: '/dashboard/support/tickets' },
        { label: 'Customer Lookup', href: '/dashboard/support/customers' },
        { label: 'Returns', href: '/dashboard/support/returns' },
        { label: 'Browse Products', href: '/products' },
      ]}
    >
      <StatCards
        cards={[
          { label: 'Open tickets', value: data?.counts.openTickets ?? null, href: '/dashboard/support/tickets' },
          { label: 'Assigned to me', value: data?.counts.assignedToMe ?? null, href: '/dashboard/support/tickets?assignment=mine' },
          { label: 'Unassigned', value: data?.counts.unassigned ?? null, href: '/dashboard/support/tickets?assignment=unassigned' },
          {
            label: 'Returns to review',
            value: data?.counts.returnsAwaitingReview ?? null,
            href: '/dashboard/support/returns?status=REQUESTED',
          },
        ]}
      />

      {data && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Workload</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Open tickets by status</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {OPEN_STATUSES.map((s) => (
                    <Chip key={s} label={`${STATUS_LABELS[s]}: ${data.ticketsByStatus[s]}`} color={STATUS_COLORS[s]} variant="outlined" />
                  ))}
                </Box>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Open tickets by priority</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {Object.values(TicketPriority).map((p) => (
                    <Chip key={p} label={`${humanize(p)}: ${data.openTicketsByPriority[p]}`} color={PRIORITY_COLORS[p]} variant="outlined" />
                  ))}
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      <TwoColumns>
        <ListCard
          title="Assigned to me"
          emptyText="Nothing assigned to you right now."
          action={{ label: 'View all', href: '/dashboard/support/tickets?assignment=mine' }}
          rows={data?.assignedToMe.map(toRow) ?? null}
        />
        <ListCard
          title="Recently updated"
          emptyText="No tickets yet."
          action={{ label: 'View all', href: '/dashboard/support/tickets' }}
          rows={data?.recentlyUpdated.map(toRow) ?? null}
        />
      </TwoColumns>
    </DashboardShell>
  );
}
