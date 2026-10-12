'use client';

// Phase 7

// WHAT THIS FILE IS:
// The support ticket queue at /dashboard/support/tickets - SUPPORT_AGENT,
// OPERATIONS_MANAGER, ADMIN only. Every ticket, most recently updated first
// (so a customer's new reply rises to the top), with two filters:
//   - Status: sent to the backend (?status=...)
//   - Assignment: "Assigned to me" is sent to the backend (?assignedToMe=true);
//     "Unassigned" is filtered here, since the backend has no such filter.
// Both start from the URL (?status=...&assignment=mine|unassigned), which is
// how the dashboard's count cards link straight into a filtered queue.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import { useAuth } from '@/hooks/useAuth';
import { getTicketQueue } from '@/lib/api/support';
import { DASHBOARD_ROUTES, SUPPORT_STAFF_ROLES } from '@/lib/dashboard-routes';
import {
  CATEGORY_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS,
  STATUS_LABELS,
  SupportTicket,
  TicketStatus,
} from '@/types/support';

type AssignmentFilter = '' | 'mine' | 'unassigned';

function parseStatus(value: string | null | undefined): TicketStatus | '' {
  return Object.values(TicketStatus).find((s) => s === value) ?? '';
}

function parseAssignment(value: string | null | undefined): AssignmentFilter {
  return value === 'mine' || value === 'unassigned' ? value : '';
}

// useSearchParams() requires a Suspense boundary - same reasoning as the
// shipment detail page.
export default function SupportTicketsPage() {
  return (
    <Suspense fallback={null}>
      <TicketQueue />
    </Suspense>
  );
}

function TicketQueue() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, loading: authLoading } = useAuth();

  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>(parseStatus(searchParams?.get('status')));
  const [assignment, setAssignment] = useState<AssignmentFilter>(parseAssignment(searchParams?.get('assignment')));
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && !SUPPORT_STAFF_ROLES.includes(user.role)) { router.push(DASHBOARD_ROUTES[user.role]); return; }

    getTicketQueue(token, { status: statusFilter || undefined, assignedToMe: assignment === 'mine' })
      .then(setTickets)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load tickets'));
  }, [token, user, authLoading, router, statusFilter, assignment]);

  if (!user || !SUPPORT_STAFF_ROLES.includes(user.role)) return null;

  const visible = assignment === 'unassigned'
    ? tickets?.filter((t) => !t.assignedAgentId)
    : tickets;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Support Tickets</Typography>
        <Button variant="outlined" onClick={() => router.push('/dashboard/support')}>
          Back to Dashboard
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl size="small" sx={{ width: 220 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            label="Status"
            value={statusFilter}
            onChange={(e) => { setTickets(null); setStatusFilter(e.target.value as TicketStatus | ''); }}
          >
            <MenuItem value="">All</MenuItem>
            {Object.values(TicketStatus).map((status) => (
              <MenuItem key={status} value={status}>{STATUS_LABELS[status]}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ width: 220 }}>
          <InputLabel id="assignment-filter-label">Assignment</InputLabel>
          <Select
            labelId="assignment-filter-label"
            label="Assignment"
            value={assignment}
            onChange={(e) => { setTickets(null); setAssignment(e.target.value as AssignmentFilter); }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="mine">Assigned to me</MenuItem>
            <MenuItem value="unassigned">Unassigned</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {!visible ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      ) : visible.length === 0 ? (
        <Typography color="text.secondary">No tickets match these filters.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Subject</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Last Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/dashboard/support/tickets/detail?id=${ticket.id}`)}
                >
                  <TableCell>{ticket.subject}</TableCell>
                  <TableCell>
                    {ticket.customer ? `${ticket.customer.firstName} ${ticket.customer.lastName}` : '—'}
                  </TableCell>
                  <TableCell>{CATEGORY_LABELS[ticket.category]}</TableCell>
                  <TableCell>
                    <Chip label={ticket.priority} size="small" variant="outlined" color={PRIORITY_COLORS[ticket.priority]} />
                  </TableCell>
                  <TableCell>
                    <Chip label={STATUS_LABELS[ticket.status]} size="small" color={STATUS_COLORS[ticket.status]} />
                  </TableCell>
                  <TableCell>
                    {ticket.assignedAgent
                      ? `${ticket.assignedAgent.firstName} ${ticket.assignedAgent.lastName}`
                      : <Typography variant="body2" color="text.secondary">Unassigned</Typography>}
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
