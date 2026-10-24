'use client';

// Phase 8

// WHAT THIS FILE IS:
// The Return Request form at /returns/new - CUSTOMER only. Only DELIVERED
// orders can be picked. For the chosen order, each item gets a checkbox, a
// quantity (capped at what's still returnable - bought minus anything on an
// earlier return that wasn't rejected, the same rule the backend enforces),
// and optional condition notes. Then a reason and up to 5 photos.
// Arriving with ?orderId=... (the "Request a return" button on My Orders)
// pre-selects that order.
//
// Submitting is two steps, because a JSON request can't carry files:
// create the return, then upload each photo to it. If a photo fails the
// return still exists, so the customer lands on its details page either
// way, where photos can be added again.

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
import Checkbox from '@mui/material/Checkbox';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';
import { getOrders } from '@/lib/api/orders';
import { createReturn, getMyReturns, uploadReturnPhoto } from '@/lib/api/returns';
import { DASHBOARD_ROUTES } from '@/lib/dashboard-routes';
import { MAX_PHOTOS, PHOTO_TYPES } from '@/components/returns/ReturnPhotos';
import { Order, OrderStatus } from '@/types/order';
import { ReturnRequest, ReturnStatus } from '@/types/returns';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

interface ItemChoice {
  selected: boolean;
  quantity: number;
  conditionNotes: string;
}

// useSearchParams() requires a Suspense boundary - same reasoning as the
// shipment detail page.
export default function NewReturnPage() {
  return (
    <Suspense fallback={null}>
      <NewReturnForm />
    </Suspense>
  );
}

function NewReturnForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetOrderId = searchParams?.get('orderId') ?? '';
  const { user, token, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [pastReturns, setPastReturns] = useState<ReturnRequest[]>([]);
  const [orderId, setOrderId] = useState(presetOrderId);
  const [choices, setChoices] = useState<Record<string, ItemChoice>>({});
  const [reason, setReason] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && user.role !== UserRole.CUSTOMER) { router.push(DASHBOARD_ROUTES[user.role]); return; }

    Promise.all([getOrders(token), getMyReturns(token)])
      .then(([allOrders, myReturns]) => {
        setOrders(allOrders.filter((order) => order.status === OrderStatus.DELIVERED));
        setPastReturns(myReturns);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load your orders'));
  }, [token, user, authLoading, router]);

  if (!user || user.role !== UserRole.CUSTOMER) return null;

  if (!orders) {
    return error ? (
      <Box sx={{ p: 4 }}><Alert severity="error">{error}</Alert></Box>
    ) : (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const order = orders.find((o) => o.id === orderId);

  // How many of each order item are already on a return that's still going
  // ahead - rejected ones don't count, the items never came back.
  function alreadyReturned(orderItemId: string): number {
    return pastReturns
      .filter((r) => r.status !== ReturnStatus.REJECTED)
      .flatMap((r) => r.items ?? [])
      .filter((item) => item.orderItemId === orderItemId)
      .reduce((sum, item) => sum + item.quantity, 0);
  }

  function choiceFor(orderItemId: string): ItemChoice {
    return choices[orderItemId] ?? { selected: false, quantity: 1, conditionNotes: '' };
  }

  function updateChoice(orderItemId: string, change: Partial<ItemChoice>) {
    setChoices((prev) => ({ ...prev, [orderItemId]: { ...choiceFor(orderItemId), ...change } }));
  }

  function handleOrderChange(newOrderId: string) {
    setOrderId(newOrderId);
    setChoices({});
  }

  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    const tooBig = picked.find((file) => file.size > MAX_PHOTO_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" is larger than 5 MB`);
      return;
    }
    setError('');
    setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
  }

  const selectedItems = (order?.items ?? []).filter((item) => choiceFor(item.id).selected);
  const canSubmit = order && selectedItems.length > 0 && reason.trim() && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !order) return;
    setError('');
    setSubmitting(true);

    let created: ReturnRequest;
    try {
      created = await createReturn(token, {
        orderId: order.id,
        reason: reason.trim(),
        items: selectedItems.map((item) => {
          const choice = choiceFor(item.id);
          return {
            orderItemId: item.id,
            quantity: choice.quantity,
            ...(choice.conditionNotes.trim() ? { conditionNotes: choice.conditionNotes.trim() } : {}),
          };
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request return');
      setSubmitting(false);
      return;
    }

    let failedPhotos = 0;
    for (const photo of photos) {
      try {
        await uploadReturnPhoto(token, created.id, photo);
      } catch {
        failedPhotos += 1;
      }
    }
    router.push(`/returns/detail?id=${created.id}&created=1${failedPhotos ? `&photoErrors=${failedPhotos}` : ''}`);
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6, pb: 6 }}>
      <Box sx={{ width: 680 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h5">Request a Return</Typography>
          <Button variant="outlined" size="small" onClick={() => router.back()}>
            Cancel
          </Button>
        </Box>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Choose the items you want to send back. Only delivered orders can be returned.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {orders.length === 0 ? (
          <Alert severity="info">
            You don&apos;t have any delivered orders yet. Once an order is delivered, you can return items from it here.
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <FormControl fullWidth margin="normal" required>
              <InputLabel id="order-label">Order</InputLabel>
              <Select
                labelId="order-label"
                label="Order"
                value={order ? orderId : ''}
                onChange={(e) => handleOrderChange(e.target.value)}
              >
                {orders.map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {new Date(o.createdAt).toLocaleDateString()} · ${Number(o.totalAmount).toFixed(2)} · #{o.id.slice(0, 8)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {order && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Items to return</Typography>
                {(order.items ?? []).map((item) => {
                  const remaining = item.quantity - alreadyReturned(item.id);
                  const choice = choiceFor(item.id);
                  return (
                    <Paper key={item.id} variant="outlined" sx={{ p: 2, mb: 1, opacity: remaining > 0 ? 1 : 0.6 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Checkbox
                          checked={choice.selected}
                          disabled={remaining <= 0}
                          onChange={(e) => updateChoice(item.id, { selected: e.target.checked })}
                        />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography>{item.productName}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            ${Number(item.unitPrice).toFixed(2)} each · bought {item.quantity}
                          </Typography>
                        </Box>
                        {remaining <= 0 ? (
                          <Chip label="Already returned" size="small" />
                        ) : (
                          <TextField
                            label="Quantity"
                            type="number"
                            size="small"
                            sx={{ width: 110 }}
                            disabled={!choice.selected}
                            value={choice.quantity}
                            onChange={(e) => {
                              const value = Math.round(Number(e.target.value));
                              updateChoice(item.id, { quantity: Math.min(Math.max(value, 1), remaining) });
                            }}
                            slotProps={{ htmlInput: { min: 1, max: remaining } }}
                            helperText={`max ${remaining}`}
                          />
                        )}
                      </Box>
                      {choice.selected && (
                        <TextField
                          label="Condition (optional)"
                          placeholder="e.g. cracked handle, box crushed"
                          size="small"
                          fullWidth
                          sx={{ mt: 1 }}
                          value={choice.conditionNotes}
                          onChange={(e) => updateChoice(item.id, { conditionNotes: e.target.value })}
                        />
                      )}
                    </Paper>
                  );
                })}
              </Box>
            )}

            <TextField
              label="Why are you returning these items?"
              fullWidth
              required
              multiline
              minRows={3}
              margin="normal"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle1">Photos (optional)</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Photos of damaged or incorrect items help us review your return faster. Up to {MAX_PHOTOS}, JPEG,
                PNG, or WebP, 5 MB each.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                {photos.map((photo, index) => (
                  <Chip
                    key={`${photo.name}-${index}`}
                    label={photo.name}
                    onDelete={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                  />
                ))}
              </Box>
              {photos.length < MAX_PHOTOS && (
                <Button variant="outlined" size="small" component="label">
                  Add photos
                  <input type="file" accept={PHOTO_TYPES} multiple hidden onChange={handlePhotos} />
                </Button>
              )}
            </Box>

            <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }} disabled={!canSubmit}>
              {submitting ? 'Submitting...' : 'Submit Return Request'}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
