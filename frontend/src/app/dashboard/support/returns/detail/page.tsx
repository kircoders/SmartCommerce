'use client';

// Phase 8

// WHAT THIS FILE IS:
// The staff Return Details page at /dashboard/support/returns/detail?id=...
// - SUPPORT_AGENT, OPERATIONS_MANAGER, ADMIN only. Two columns:
//   - Left: what the customer sent - reason, items with the refund total,
//     and their photos.
//   - Right: what staff act on - the next step for the current status,
//     internal notes, customer info (linking to Customer Lookup), the
//     order, and the refund once issued.
// Only the next valid step is offered (the same order the backend
// enforces): REQUESTED -> approve/reject, APPROVED -> mark received (puts
// the stock back), RECEIVED -> issue refund (operations managers and
// admins only). Reject, receive, and refund can't be undone, so each asks
// for confirmation first.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import { useAuth } from '@/hooks/useAuth';
import { getStaffReturn, issueRefund, updateReturn } from '@/lib/api/returns';
import { DASHBOARD_ROUTES, REFUND_ROLES, SUPPORT_STAFF_ROLES } from '@/lib/dashboard-routes';
import ReturnItemsTable, { refundTotal } from '@/components/returns/ReturnItemsTable';
import ReturnPhotos from '@/components/returns/ReturnPhotos';
import { RETURN_STATUS_COLORS, RETURN_STATUS_LABELS, ReturnRequest, ReturnStatus } from '@/types/returns';

type Action = 'approve' | 'reject' | 'receive' | 'refund' | 'notes';

interface Confirmation {
  action: Action;
  title: string;
  body: string;
  confirmLabel: string;
}

// useSearchParams() requires a Suspense boundary - same reasoning as the
// shipment detail page.
export default function StaffReturnPage() {
  return (
    <Suspense fallback={null}>
      <StaffReturnDetail />
    </Suspense>
  );
}

function StaffReturnDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnId = searchParams?.get('id') ?? '';
  const { user, token, loading: authLoading } = useAuth();

  const [ret, setRet] = useState<ReturnRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState<Action | null>(null);
  const [confirming, setConfirming] = useState<Confirmation | null>(null);
  const [error, setError] = useState('');

  function applyReturn(data: ReturnRequest) {
    setRet(data);
    setNotes(data.internalNotes ?? '');
  }

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && !SUPPORT_STAFF_ROLES.includes(user.role)) { router.push(DASHBOARD_ROUTES[user.role]); return; }
    if (!returnId) { router.push('/dashboard/support/returns'); return; }

    getStaffReturn(token, returnId)
      .then(applyReturn)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load return'));
  }, [token, user, authLoading, router, returnId]);

  async function run(action: Action) {
    if (!token) return;
    setConfirming(null);
    setError('');
    setSaving(action);
    try {
      if (action === 'refund') {
        await issueRefund(token, returnId);
      } else if (action === 'notes') {
        await updateReturn(token, returnId, { internalNotes: notes });
      } else {
        const status = {
          approve: ReturnStatus.APPROVED,
          reject: ReturnStatus.REJECTED,
          receive: ReturnStatus.RECEIVED,
        } as const;
        await updateReturn(token, returnId, { status: status[action] });
      }
      // Re-fetch rather than trusting each response's shape - the page
      // always shows what the backend actually saved.
      applyReturn(await getStaffReturn(token, returnId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(null);
    }
  }

  if (!user || !SUPPORT_STAFF_ROLES.includes(user.role)) return null;

  if (!ret) {
    return error ? (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="outlined" onClick={() => router.push('/dashboard/support/returns')}>Back to Returns</Button>
      </Box>
    ) : (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const items = ret.items ?? [];
  const amount = refundTotal(items).toFixed(2);
  const canRefund = REFUND_ROLES.includes(user.role);
  const busy = saving !== null;

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h5">Return for order #{ret.orderId.slice(0, 8)}</Typography>
        <Button variant="outlined" size="small" onClick={() => router.push('/dashboard/support/returns')}>
          Back to Returns
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 3 }}>
        <Chip label={RETURN_STATUS_LABELS[ret.status]} size="small" color={RETURN_STATUS_COLORS[ret.status]} />
        <Typography variant="body2" color="text.secondary">
          Requested {new Date(ret.requestedAt).toLocaleString()}
          {ret.reviewer && ret.reviewedAt &&
            ` · Reviewed by ${ret.reviewer.firstName} ${ret.reviewer.lastName}, ${new Date(ret.reviewedAt).toLocaleString()}`}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 4, alignItems: 'start' }}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>Reason</Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>{ret.reason}</Typography>

          <Typography variant="h6" sx={{ mb: 1 }}>Items</Typography>
          <ReturnItemsTable items={items} />

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Photos</Typography>
          <ReturnPhotos photos={ret.evidence ?? []} />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Next step</Typography>

            {ret.status === ReturnStatus.REQUESTED && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" color="success" fullWidth disabled={busy} onClick={() => run('approve')}>
                  {saving === 'approve' ? 'Saving...' : 'Approve'}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                  disabled={busy}
                  onClick={() => setConfirming({
                    action: 'reject',
                    title: 'Reject this return?',
                    body: "The customer will see it as rejected. This can't be undone.",
                    confirmLabel: 'Reject',
                  })}
                >
                  {saving === 'reject' ? 'Saving...' : 'Reject'}
                </Button>
              </Box>
            )}

            {ret.status === ReturnStatus.APPROVED && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Waiting for the customer to send the items back.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  disabled={busy}
                  onClick={() => setConfirming({
                    action: 'receive',
                    title: 'Mark items as received?',
                    body: "The returned items go back into inventory as available stock. This can't be undone.",
                    confirmLabel: 'Mark received',
                  })}
                >
                  {saving === 'receive' ? 'Saving...' : 'Mark items received'}
                </Button>
              </>
            )}

            {ret.status === ReturnStatus.RECEIVED && (
              canRefund ? (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Items are back. Refund amount: <strong>${amount}</strong>
                  </Typography>
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    disabled={busy}
                    onClick={() => setConfirming({
                      action: 'refund',
                      title: `Issue a $${amount} refund?`,
                      body: "The return will be marked refunded. This can't be undone.",
                      confirmLabel: 'Issue refund',
                    })}
                  >
                    {saving === 'refund' ? 'Saving...' : `Issue $${amount} refund`}
                  </Button>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Items are back. An operations manager or admin will issue the ${amount} refund.
                </Typography>
              )
            )}

            {ret.status === ReturnStatus.REJECTED && (
              <Typography variant="body2" color="text.secondary">This return was rejected. Nothing left to do.</Typography>
            )}
            {ret.status === ReturnStatus.REFUNDED && (
              <Typography variant="body2" color="text.secondary">Refunded. Nothing left to do.</Typography>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1">Internal notes</Typography>
            <Typography variant="caption" color="text.secondary">Staff only. Never shown to the customer.</Typography>
            <TextField
              fullWidth
              multiline
              minRows={3}
              size="small"
              sx={{ mt: 1 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button
              variant="outlined"
              size="small"
              fullWidth
              sx={{ mt: 1 }}
              disabled={busy || notes === (ret.internalNotes ?? '')}
              onClick={() => run('notes')}
            >
              {saving === 'notes' ? 'Saving...' : 'Save notes'}
            </Button>
          </Paper>

          {ret.refund && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1">Refund</Typography>
              <Typography variant="h5">${Number(ret.refund.amount).toFixed(2)}</Typography>
              <Typography variant="body2" color="text.secondary">
                {ret.refund.status}
                {ret.refund.processor && ` by ${ret.refund.processor.firstName} ${ret.refund.processor.lastName}`}
                {ret.refund.processedAt && ` · ${new Date(ret.refund.processedAt).toLocaleString()}`}
              </Typography>
            </Paper>
          )}

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Customer</Typography>
            {ret.customer ? (
              <>
                <Typography>{ret.customer.firstName} {ret.customer.lastName}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{ret.customer.email}</Typography>
                <Button size="small" onClick={() => router.push(`/dashboard/support/customers?id=${ret.customerId}`)}>
                  View customer history
                </Button>
              </>
            ) : (
              <Typography color="text.secondary">—</Typography>
            )}
          </Paper>

          {ret.order && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Order</Typography>
              <Typography sx={{ fontFamily: 'monospace' }}>#{ret.order.id.slice(0, 8)}</Typography>
              <Typography variant="body2" color="text.secondary">
                Placed {new Date(ret.order.createdAt).toLocaleDateString()} · ${Number(ret.order.totalAmount).toFixed(2)}
              </Typography>
              <Chip label={ret.order.status} size="small" sx={{ mt: 1 }} />
            </Paper>
          )}
        </Box>
      </Box>

      <Dialog open={confirming !== null} onClose={() => setConfirming(null)}>
        <DialogTitle>{confirming?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirming?.body}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => confirming && run(confirming.action)}>
            {confirming?.confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
