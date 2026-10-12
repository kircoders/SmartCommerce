'use client';

// Phase 7

// WHAT THIS FILE IS:
// The agent's Ticket Details page at /dashboard/support/tickets/detail?id=...
// - SUPPORT_AGENT, OPERATIONS_MANAGER, ADMIN only. Two columns:
//   - Left: the conversation (shared TicketConversation) with a reply box.
//   - Right: everything an agent acts on or needs for context - status and
//     assignment controls, customer info (linking to Customer Lookup),
//     related order, and a placeholder for the AI assistant (a later phase).
// Every action re-fetches the ticket afterward, so the page always shows
// what the backend actually saved.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/types/user';
import {
  assignTicket,
  getAgentTicket,
  getSupportAgents,
  replyAsAgent,
  updateTicketStatus,
} from '@/lib/api/support';
import { DASHBOARD_ROUTES, SUPPORT_STAFF_ROLES } from '@/lib/dashboard-routes';
import TicketConversation from '@/components/support/TicketConversation';
import {
  CATEGORY_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS,
  STATUS_LABELS,
  SupportTicket,
  TicketStatus,
} from '@/types/support';

// useSearchParams() requires a Suspense boundary - same reasoning as the
// shipment detail page.
export default function AgentTicketPage() {
  return (
    <Suspense fallback={null}>
      <AgentTicketDetail />
    </Suspense>
  );
}

function AgentTicketDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketId = searchParams?.get('id') ?? '';
  const { user, token, loading: authLoading } = useAuth();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [agents, setAgents] = useState<User[]>([]);
  const [newStatus, setNewStatus] = useState<TicketStatus>(TicketStatus.OPEN);
  const [newAgentId, setNewAgentId] = useState('');
  const [saving, setSaving] = useState<'status' | 'assign' | null>(null);
  const [error, setError] = useState('');

  function applyTicket(data: SupportTicket) {
    setTicket(data);
    setNewStatus(data.status);
    setNewAgentId(data.assignedAgentId ?? '');
  }

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && !SUPPORT_STAFF_ROLES.includes(user.role)) { router.push(DASHBOARD_ROUTES[user.role]); return; }
    if (!ticketId) { router.push('/dashboard/support/tickets'); return; }

    getAgentTicket(token, ticketId)
      .then(applyTicket)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load ticket'));
    getSupportAgents(token)
      .then(setAgents)
      .catch(() => setAgents([]));
  }, [token, user, authLoading, router, ticketId]);

  async function runAction(kind: 'status' | 'assign', action: () => Promise<SupportTicket>) {
    setError('');
    setSaving(kind);
    try {
      applyTicket(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(null);
    }
  }

  async function handleReply(message: string) {
    if (!token) return;
    await replyAsAgent(token, ticketId, message);
    applyTicket(await getAgentTicket(token, ticketId));
  }

  if (!user || !SUPPORT_STAFF_ROLES.includes(user.role)) return null;

  if (!ticket) {
    return error ? (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="outlined" onClick={() => router.push('/dashboard/support/tickets')}>Back to Tickets</Button>
      </Box>
    ) : (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const currentToken = token ?? '';
  const isAgent = agents.some((agent) => agent.id === user.id);

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h5">{ticket.subject}</Typography>
        <Button variant="outlined" size="small" onClick={() => router.push('/dashboard/support/tickets')}>
          Back to Tickets
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 3 }}>
        <Chip label={STATUS_LABELS[ticket.status]} size="small" color={STATUS_COLORS[ticket.status]} />
        <Chip label={`${ticket.priority} priority`} size="small" variant="outlined" color={PRIORITY_COLORS[ticket.priority]} />
        <Typography variant="body2" color="text.secondary">
          {CATEGORY_LABELS[ticket.category]} · Opened {new Date(ticket.createdAt).toLocaleString()}
          {ticket.closedAt && ` · Closed ${new Date(ticket.closedAt).toLocaleString()}`}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 4, alignItems: 'start' }}>
        <TicketConversation ticket={ticket} currentUserId={user.id} onReply={handleReply} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Status</Typography>
            <FormControl fullWidth size="small">
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                label="Status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as TicketStatus)}
              >
                {Object.values(TicketStatus).map((status) => (
                  <MenuItem key={status} value={status}>{STATUS_LABELS[status]}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              fullWidth
              size="small"
              sx={{ mt: 1 }}
              disabled={saving !== null || newStatus === ticket.status}
              onClick={() => runAction('status', () => updateTicketStatus(currentToken, ticket.id, newStatus))}
            >
              {saving === 'status' ? 'Saving...' : 'Update Status'}
            </Button>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" sx={{ mb: 1 }}>Assigned Agent</Typography>
            <FormControl fullWidth size="small">
              <InputLabel id="agent-label">Agent</InputLabel>
              <Select
                labelId="agent-label"
                label="Agent"
                value={newAgentId}
                onChange={(e) => setNewAgentId(e.target.value)}
              >
                {/* Unassigning isn't supported by the backend, so "Unassigned"
                    only shows while nobody has been assigned yet. */}
                {!ticket.assignedAgentId && <MenuItem value="" disabled>Unassigned</MenuItem>}
                {agents.map((agent) => (
                  <MenuItem key={agent.id} value={agent.id}>
                    {agent.firstName} {agent.lastName}{agent.id === user.id ? ' (me)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Button
                variant="contained"
                fullWidth
                size="small"
                disabled={saving !== null || !newAgentId || newAgentId === ticket.assignedAgentId}
                onClick={() => runAction('assign', () => assignTicket(currentToken, ticket.id, newAgentId))}
              >
                {saving === 'assign' ? 'Saving...' : 'Assign'}
              </Button>
              {isAgent && ticket.assignedAgentId !== user.id && (
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  disabled={saving !== null}
                  onClick={() => runAction('assign', () => assignTicket(currentToken, ticket.id, user.id))}
                >
                  Assign to me
                </Button>
              )}
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Customer</Typography>
            {ticket.customer ? (
              <>
                <Typography>{ticket.customer.firstName} {ticket.customer.lastName}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{ticket.customer.email}</Typography>
                <Button
                  size="small"
                  onClick={() => router.push(`/dashboard/support/customers?id=${ticket.customerId}`)}
                >
                  View customer history
                </Button>
              </>
            ) : (
              <Typography color="text.secondary">—</Typography>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Related Order</Typography>
            {ticket.order ? (
              <>
                <Typography sx={{ fontFamily: 'monospace' }}>#{ticket.order.id.slice(0, 8)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Placed {new Date(ticket.order.createdAt).toLocaleDateString()} · $
                  {Number(ticket.order.totalAmount).toFixed(2)}
                </Typography>
                <Chip label={ticket.order.status} size="small" sx={{ mt: 1 }} />
              </>
            ) : (
              <Typography color="text.secondary">No order linked</Typography>
            )}
          </Paper>

          {/* Placeholder only - the AI assistant (complaint summaries,
              suggested replies) is built in a later phase. */}
          <Paper variant="outlined" sx={{ p: 2, borderStyle: 'dashed' }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>AI Assistant</Typography>
            <Typography variant="body2" color="text.secondary">
              Coming soon: complaint summaries and suggested replies.
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
