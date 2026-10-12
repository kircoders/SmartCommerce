'use client';

// Phase 1, Phase 7

// WHAT THIS FILE IS:
// The Support Agent Dashboard - what a SUPPORT_AGENT sees after logging in
// (operations managers and admins can open it too). A Phase 1 placeholder
// until Phase 7, which added a few at-a-glance counts and links into the
// ticket queue and customer lookup.
//
// WHAT IT DOES:
// 1. Checks the user is logged in and allowed here, otherwise redirects.
// 2. Loads the ticket queue once and counts it by status, plus the tickets
//    assigned to this agent - each count links to the matching filtered queue.
// 3. Provides navigation and a Logout button.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/lib/api/auth';
import { getTicketQueue } from '@/lib/api/support';
import { DASHBOARD_ROUTES, SUPPORT_STAFF_ROLES } from '@/lib/dashboard-routes';
import AnnouncementBanner from '@/components/ui/AnnouncementBanner';
import { SupportTicket, TicketStatus } from '@/types/support';

export default function SupportDashboard() {
  const router = useRouter();
  const { user, token, loading, clearAuth } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!token) { router.push('/login'); return; }
    if (user && !SUPPORT_STAFF_ROLES.includes(user.role)) { router.push(DASHBOARD_ROUTES[user.role]); return; }

    getTicketQueue(token)
      .then(setTickets)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load tickets'));
  }, [token, user, loading, router]);

  async function handleLogout() {
    if (token) await logout(token);
    clearAuth();
    router.push('/login');
  }

  if (!user || !SUPPORT_STAFF_ROLES.includes(user.role)) return null;

  const countByStatus = (status: TicketStatus) => tickets?.filter((t) => t.status === status).length ?? 0;
  const assignedToMe = tickets?.filter(
    (t) => t.assignedAgentId === user.id && t.status !== TicketStatus.CLOSED,
  ).length ?? 0;
  const unassigned = tickets?.filter(
    (t) => !t.assignedAgentId && t.status !== TicketStatus.CLOSED,
  ).length ?? 0;

  const stats = [
    { label: 'Open', value: countByStatus(TicketStatus.OPEN), href: `/dashboard/support/tickets?status=${TicketStatus.OPEN}` },
    { label: 'Assigned to me', value: assignedToMe, href: '/dashboard/support/tickets?assignment=mine' },
    { label: 'Unassigned', value: unassigned, href: '/dashboard/support/tickets?assignment=unassigned' },
    {
      label: 'Waiting for customer',
      value: countByStatus(TicketStatus.WAITING_FOR_CUSTOMER),
      href: `/dashboard/support/tickets?status=${TicketStatus.WAITING_FOR_CUSTOMER}`,
    },
  ];

  return (
    <Box>
      <AnnouncementBanner />
      <Box sx={{ p: 4, maxWidth: 960, mx: 'auto' }}>
        <Typography variant="h4" sx={{ mb: 1 }}>Support Dashboard</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Welcome, {user.firstName}! You are logged in as {user.role}.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
          {stats.map((stat) => (
            <Card key={stat.label} variant="outlined">
              <CardActionArea onClick={() => router.push(stat.href)}>
                <CardContent>
                  <Typography variant="h3">{tickets ? stat.value : '–'}</Typography>
                  <Typography color="text.secondary">{stat.label}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={() => router.push('/dashboard/support/tickets')}>Support Tickets</Button>
          <Button variant="contained" onClick={() => router.push('/dashboard/support/customers')}>Customer Lookup</Button>
          <Button variant="outlined" onClick={() => router.push('/products')}>Browse Products</Button>
          <Button variant="outlined" onClick={handleLogout}>Logout</Button>
        </Box>
      </Box>
    </Box>
  );
}
