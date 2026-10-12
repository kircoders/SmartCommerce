'use client';

// Phase 7

// WHAT THIS FILE IS:
// "My Support Tickets" at /support - CUSTOMER only. Every ticket this
// customer has filed, most recently updated first (matches the backend's
// findAllForCustomer() ordering), so a ticket with a new agent reply rises
// to the top. Clicking a row opens its details (?id=..., same query-param
// pattern as every other detail page in this static-export app).

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';
import { getMyTickets } from '@/lib/api/support';
import { DASHBOARD_ROUTES } from '@/lib/dashboard-routes';
import { CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS, SupportTicket } from '@/types/support';

export default function MyTicketsPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && user.role !== UserRole.CUSTOMER) { router.push(DASHBOARD_ROUTES[user.role]); return; }

    getMyTickets(token)
      .then(setTickets)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load tickets'));
  }, [token, user, authLoading, router]);

  if (!user || user.role !== UserRole.CUSTOMER) return null;

  if (!tickets && !error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">My Support Tickets</Typography>
        <Box>
          <Button variant="contained" onClick={() => router.push('/support/new')} sx={{ mr: 2 }}>
            Contact Support
          </Button>
          <Button variant="outlined" onClick={() => router.push('/dashboard/customer')}>
            Back to Dashboard
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {tickets && tickets.length === 0 ? (
        <Typography color="text.secondary">
          You haven&apos;t contacted support yet.{' '}
          <Button onClick={() => router.push('/support/new')}>Contact Support</Button>
        </Typography>
      ) : tickets && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Subject</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Related Order</TableCell>
                <TableCell>Last Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/support/ticket?id=${ticket.id}`)}
                >
                  <TableCell>{ticket.subject}</TableCell>
                  <TableCell>{CATEGORY_LABELS[ticket.category]}</TableCell>
                  <TableCell>
                    <Chip label={STATUS_LABELS[ticket.status]} size="small" color={STATUS_COLORS[ticket.status]} />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    {ticket.orderId ? `#${ticket.orderId.slice(0, 8)}` : '—'}
                  </TableCell>
                  <TableCell>{new Date(ticket.updatedAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
