'use client';

// Phase 7

// WHAT THIS FILE IS:
// The customer's Ticket Details page at /support/ticket?id=... - CUSTOMER
// only, and only for their own tickets (the backend returns 404 for anyone
// else's). Ticket summary on top, then the shared TicketConversation with
// a reply box. Arriving with &created=1 (straight from the Contact Support
// form) shows a one-time "submitted" confirmation.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';
import { getMyTicket, replyAsCustomer } from '@/lib/api/support';
import { DASHBOARD_ROUTES } from '@/lib/dashboard-routes';
import TicketConversation from '@/components/support/TicketConversation';
import { CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS, SupportTicket } from '@/types/support';

// useSearchParams() requires a Suspense boundary - same reasoning as the
// shipment detail page.
export default function CustomerTicketPage() {
  return (
    <Suspense fallback={null}>
      <CustomerTicketDetail />
    </Suspense>
  );
}

function CustomerTicketDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketId = searchParams?.get('id') ?? '';
  const justCreated = searchParams?.get('created') === '1';
  const { user, token, loading: authLoading } = useAuth();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && user.role !== UserRole.CUSTOMER) { router.push(DASHBOARD_ROUTES[user.role]); return; }
    if (!ticketId) { router.push('/support'); return; }

    getMyTicket(token, ticketId)
      .then(setTicket)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load ticket'));
  }, [token, user, authLoading, router, ticketId]);

  // Re-fetch after replying so the new message (and the ticket's updated
  // timestamp) come from the backend rather than being guessed locally.
  async function handleReply(message: string) {
    if (!token) return;
    await replyAsCustomer(token, ticketId, message);
    setTicket(await getMyTicket(token, ticketId));
  }

  if (!user || user.role !== UserRole.CUSTOMER) return null;

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="outlined" onClick={() => router.push('/support')}>Back to My Tickets</Button>
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6, pb: 6 }}>
      <Box sx={{ width: 720 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">{ticket.subject}</Typography>
          <Button variant="outlined" size="small" onClick={() => router.push('/support')}>
            Back to My Tickets
          </Button>
        </Box>

        {justCreated && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Your ticket has been submitted. A support agent will respond soon.
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 3 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Status</Typography>
            <Chip label={STATUS_LABELS[ticket.status]} size="small" color={STATUS_COLORS[ticket.status]} />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Category</Typography>
            <Typography>{CATEGORY_LABELS[ticket.category]}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Related Order</Typography>
            <Typography sx={{ fontFamily: 'monospace' }}>
              {ticket.orderId ? `#${ticket.orderId.slice(0, 8)}` : '—'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Handled By</Typography>
            <Typography>
              {ticket.assignedAgent ? ticket.assignedAgent.firstName : 'Not yet assigned'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Opened</Typography>
            <Typography>{new Date(ticket.createdAt).toLocaleString()}</Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <TicketConversation ticket={ticket} currentUserId={user.id} onReply={handleReply} />
      </Box>
    </Box>
  );
}
