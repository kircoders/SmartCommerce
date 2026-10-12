'use client';

// Phase 7

// WHAT THIS FILE IS:
// The Contact Support form at /support/new - CUSTOMER only. Category,
// subject, message, and an optional related order (picked from the
// customer's own orders). Arriving with ?orderId=... (the "Get help with
// this order" button on My Orders) pre-selects that order. On submit, goes
// straight to the new ticket's details page.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';
import { getOrders } from '@/lib/api/orders';
import { createTicket } from '@/lib/api/support';
import { DASHBOARD_ROUTES } from '@/lib/dashboard-routes';
import { Order } from '@/types/order';
import { CATEGORY_LABELS, TicketCategory } from '@/types/support';

const SUBJECT_MAX_LENGTH = 200;

// useSearchParams() requires a Suspense boundary - same reasoning as the
// shipment detail page.
export default function NewTicketPage() {
  return (
    <Suspense fallback={null}>
      <NewTicketForm />
    </Suspense>
  );
}

function NewTicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetOrderId = searchParams?.get('orderId') ?? '';
  const { user, token, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [category, setCategory] = useState<TicketCategory | ''>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [orderId, setOrderId] = useState(presetOrderId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && user.role !== UserRole.CUSTOMER) { router.push(DASHBOARD_ROUTES[user.role]); return; }

    // The order picker is optional, so a failure here shouldn't block the
    // form - the customer can still file a ticket without linking an order.
    getOrders(token).then(setOrders).catch(() => setOrders([]));
  }, [token, user, authLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !category) return;
    setError('');
    setSubmitting(true);
    try {
      const ticket = await createTicket(token, {
        category,
        subject: subject.trim(),
        description: description.trim(),
        ...(orderId ? { orderId } : {}),
      });
      router.push(`/support/ticket?id=${ticket.id}&created=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit ticket');
      setSubmitting(false);
    }
  }

  if (!user || user.role !== UserRole.CUSTOMER) return null;

  const canSubmit = category && subject.trim() && description.trim() && !submitting;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6, pb: 6 }}>
      <Box sx={{ width: 560 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h5">Contact Support</Typography>
          <Button variant="outlined" size="small" onClick={() => router.back()}>
            Cancel
          </Button>
        </Box>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Tell us what went wrong and a support agent will get back to you.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="category-label">What&apos;s the problem?</InputLabel>
            <Select
              labelId="category-label"
              label="What's the problem?"
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
            >
              {Object.values(TicketCategory).map((value) => (
                <MenuItem key={value} value={value}>{CATEGORY_LABELS[value]}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel id="order-label">Related order (optional)</InputLabel>
            <Select
              labelId="order-label"
              label="Related order (optional)"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            >
              <MenuItem value="">No specific order</MenuItem>
              {orders.map((order) => (
                <MenuItem key={order.id} value={order.id}>
                  {new Date(order.createdAt).toLocaleDateString()} · ${Number(order.totalAmount).toFixed(2)} ·{' '}
                  {order.status} · #{order.id.slice(0, 8)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Subject"
            fullWidth
            required
            margin="normal"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            slotProps={{ htmlInput: { maxLength: SUBJECT_MAX_LENGTH } }}
            helperText={`${subject.length}/${SUBJECT_MAX_LENGTH}`}
          />

          <TextField
            label="Describe the problem"
            fullWidth
            required
            multiline
            minRows={5}
            margin="normal"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={!canSubmit}>
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
