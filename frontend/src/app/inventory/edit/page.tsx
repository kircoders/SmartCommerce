'use client';

// Phase 3

// WHAT THIS FILE IS:
// The inventory detail/update page at /inventory/edit?id=<productId> -
// WAREHOUSE_OPERATOR, OPERATIONS_MANAGER, ADMIN only. Same query-param
// pattern (not a [id] dynamic route) as the Phase 2 admin product edit
// page, for the same reason: this app builds as a static export
// (output: 'export'), which can't pre-render dynamic path segments for
// ids that don't exist until runtime.
//
// WHAT IT DOES:
// 1. Checks the user is logged in and has an allowed role.
// 2. Reads ?id=... and fetches that product's inventory record + its
//    adjustment history.
// 3. "Current Stock" section: Reserved/Threshold save immediately
//    (quiet, no audit trail - the adjustment endpoint has no concept of
//    changing those). Changing Available does NOT save immediately -
//    instead it computes the delta and "locks" the Record Adjustment
//    section below into a pending state: Type and Quantity are filled in
//    automatically and disabled, only Reason stays editable. Nothing is
//    actually persisted until that pending adjustment is confirmed.
// 4. "Record Adjustment" section: when nothing is pending, this is a free-
//    form audited stock change (pick type/quantity/reason yourself). When
//    a change came from Current Stock, it's locked to that exact
//    type/amount - you can only supply the reason, then confirm or cancel.
// 5. "History" section: every past adjustment for this product, newest
//    first. Only ever changes when an adjustment is actually confirmed.

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
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';
import {
  getInventoryForProduct,
  updateInventory,
  createAdjustment,
  getAdjustments,
} from '@/lib/api/inventory';
import { Inventory, InventoryAdjustment, AdjustmentType } from '@/types/inventory';

const ALLOWED_ROLES = [UserRole.WAREHOUSE_OPERATOR, UserRole.OPERATIONS_MANAGER, UserRole.ADMIN];

export default function InventoryEditPage() {
  return (
    <Suspense fallback={null}>
      <InventoryEditForm />
    </Suspense>
  );
}

function InventoryEditForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('id') ?? '';
  const { user, token, loading: authLoading } = useAuth();

  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [error, setError] = useState('');

  const [quantityAvailable, setQuantityAvailable] = useState('');
  const [quantityReserved, setQuantityReserved] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [saving, setSaving] = useState(false);

  const [adjType, setAdjType] = useState<AdjustmentType>(AdjustmentType.INCREASE);
  const [adjQuantity, setAdjQuantity] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  // Set (non-null) whenever Save Changes detects Available actually moved.
  // While this is set, Type and Quantity in Record Adjustment are locked
  // to these exact values - the user can only fill in Reason and then
  // confirm or cancel. Nothing about the Available change is persisted
  // until confirmed.
  const [pendingAdjustment, setPendingAdjustment] =
    useState<{ type: AdjustmentType; quantityChange: number } | null>(null);

  // Total is never entered directly - it's always available + reserved,
  // computed live from whatever's currently in those two fields.
  const computedTotal = (Number(quantityAvailable) || 0) + (Number(quantityReserved) || 0);

  // Two separate refresh functions on purpose: saving Reserved/Threshold
  // (quiet) should never touch the adjustment history, and confirming an
  // adjustment needs both - the totals it just changed, AND the new
  // history row it just created.
  function refreshInventory(currentToken: string) {
    return getInventoryForProduct(currentToken, productId).then((inv) => {
      setInventory(inv);
      setQuantityAvailable(String(inv.quantityAvailable));
      setQuantityReserved(String(inv.quantityReserved));
      setLowStockThreshold(String(inv.lowStockThreshold));
    });
  }

  function refreshAdjustments(currentToken: string) {
    return getAdjustments(currentToken, productId).then(setAdjustments);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && !ALLOWED_ROLES.includes(user.role)) { router.push('/dashboard/customer'); return; }
    if (!productId) { router.push('/inventory'); return; }

    Promise.all([refreshInventory(token), refreshAdjustments(token)]).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load inventory'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, authLoading, router, productId]);

  async function handleSaveStock(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !inventory) return;
    setError('');
    setSaving(true);
    try {
      const newReserved = Number(quantityReserved);
      const newThreshold = Number(lowStockThreshold);

      // Reserved and threshold save immediately - the adjustment endpoint
      // has no concept of changing them, so there's nothing to lock/confirm.
      if (
        newReserved !== inventory.quantityReserved ||
        newThreshold !== inventory.lowStockThreshold
      ) {
        await updateInventory(token, productId, {
          quantityReserved: newReserved,
          lowStockThreshold: newThreshold,
        });
        await refreshInventory(token);
      }

      // Available is different: don't save it here at all. Compute the
      // delta, lock Record Adjustment to it, and let the user supply a
      // reason and explicitly confirm before anything is persisted.
      const newAvailable = Number(quantityAvailable);
      const delta = newAvailable - inventory.quantityAvailable;
      if (delta !== 0) {
        const type = delta > 0 ? AdjustmentType.INCREASE : AdjustmentType.DECREASE;
        setPendingAdjustment({ type, quantityChange: delta });
        setAdjType(type);
        setAdjQuantity(String(delta));
        setAdjReason('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update inventory');
    } finally {
      setSaving(false);
    }
  }

  function handleCancelPending() {
    setPendingAdjustment(null);
    setAdjQuantity('');
    setAdjReason('');
    // Available was never actually saved - reset the input back to
    // whatever's really on the server.
    if (inventory) setQuantityAvailable(String(inventory.quantityAvailable));
  }

  async function handleSubmitAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');

    // If a pending adjustment exists (came from Save Changes), use its
    // locked values rather than whatever's in the (disabled) fields -
    // this is really just defensive, since they're kept in sync anyway.
    const type = pendingAdjustment ? pendingAdjustment.type : adjType;
    const parsedChange = pendingAdjustment ? pendingAdjustment.quantityChange : Number(adjQuantity);

    if (Number.isNaN(parsedChange) || parsedChange === 0) {
      setError('Quantity change must be a non-zero number');
      return;
    }

    setSubmittingAdjustment(true);
    try {
      await createAdjustment(token, {
        productId,
        adjustmentType: type,
        quantityChange: parsedChange,
        reason: adjReason || undefined,
      });
      setPendingAdjustment(null);
      setAdjQuantity('');
      setAdjReason('');
      await Promise.all([refreshInventory(token), refreshAdjustments(token)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record adjustment');
    } finally {
      setSubmittingAdjustment(false);
    }
  }

  if (!user || !ALLOWED_ROLES.includes(user.role) || !inventory) return null;

  const fieldsLocked = pendingAdjustment !== null;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6, pb: 6 }}>
      <Box sx={{ width: 520 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">{inventory.product.name}</Typography>
          <Button variant="outlined" size="small" onClick={() => router.push('/inventory')}>
            Back to Inventory
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Typography variant="h6" sx={{ mb: 1 }}>Current Stock</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Reserved and threshold save immediately. Changing Available requires
          confirming an adjustment below first.
        </Typography>
        <Box component="form" onSubmit={handleSaveStock} sx={{ mb: 4 }}>
          <TextField
            label="Available"
            type="number"
            fullWidth
            margin="normal"
            value={quantityAvailable}
            onChange={(e) => setQuantityAvailable(e.target.value)}
            disabled={fieldsLocked}
          />
          <TextField
            label="Reserved"
            type="number"
            fullWidth
            margin="normal"
            value={quantityReserved}
            onChange={(e) => setQuantityReserved(e.target.value)}
            disabled={fieldsLocked}
          />
          <TextField
            label="Total"
            type="number"
            fullWidth
            margin="normal"
            value={computedTotal}
            disabled
            helperText="Available + Reserved - not editable directly"
          />
          <TextField
            label="Low Stock Threshold"
            type="number"
            fullWidth
            margin="normal"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
            disabled={fieldsLocked}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            disabled={saving || fieldsLocked}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Typography variant="h6" sx={{ mb: 1 }}>Record Adjustment</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {fieldsLocked
            ? 'Type and quantity are set from your Available change above - add a reason and confirm.'
            : 'Audited stock change - updates the totals above and adds a permanent history entry.'}
        </Typography>
        <Box component="form" onSubmit={handleSubmitAdjustment} sx={{ mb: 4 }}>
          <FormControl fullWidth margin="normal" disabled={fieldsLocked}>
            <InputLabel id="adj-type-label">Type</InputLabel>
            <Select
              labelId="adj-type-label"
              label="Type"
              value={adjType}
              onChange={(e) => setAdjType(e.target.value as AdjustmentType)}
            >
              <MenuItem value={AdjustmentType.INCREASE}>Increase</MenuItem>
              <MenuItem value={AdjustmentType.DECREASE}>Decrease</MenuItem>
              <MenuItem value={AdjustmentType.CORRECTION}>Correction</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Quantity Change"
            type="number"
            helperText="Positive to increase, negative to decrease"
            fullWidth
            margin="normal"
            value={adjQuantity}
            onChange={(e) => setAdjQuantity(e.target.value)}
            disabled={fieldsLocked}
            required
          />
          <TextField
            label="Reason"
            fullWidth
            margin="normal"
            value={adjReason}
            onChange={(e) => setAdjReason(e.target.value)}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            {fieldsLocked && (
              <Button variant="outlined" fullWidth onClick={handleCancelPending}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={submittingAdjustment}
            >
              {submittingAdjustment
                ? 'Submitting...'
                : fieldsLocked
                  ? 'Confirm Adjustment'
                  : 'Submit Adjustment'}
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="h6" sx={{ mb: 2 }}>History</Typography>
        {adjustments.length === 0 ? (
          <Typography color="text.secondary" variant="body2">No adjustments yet.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell align="right">Change</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adjustments.map((adj) => (
                <TableRow key={adj.id}>
                  <TableCell>{adj.adjustmentType}</TableCell>
                  <TableCell align="right">
                    {adj.quantityChange > 0 ? `+${adj.quantityChange}` : adj.quantityChange}
                  </TableCell>
                  <TableCell>{adj.reason ?? '—'}</TableCell>
                  <TableCell>{new Date(adj.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>
    </Box>
  );
}
