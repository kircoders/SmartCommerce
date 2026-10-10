'use client';

// Phase 6

// WHAT THIS FILE IS:
// The shipment detail page at /dashboard/warehouse/shipments/detail?id=... -
// WAREHOUSE_OPERATOR, OPERATIONS_MANAGER, ADMIN only. Two independent
// actions: change the status (which also syncs the linked order's status
// server-side, see ShipmentsService.updateStatus()), and/or set the
// tracking number. Both re-fetch the shipment afterward so shippedDate/
// deliveredDate stay in sync with whatever the backend actually set.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';
import { getShipment, updateShipmentStatus, updateTrackingNumber } from '@/lib/api/shipments';
import { Shipment, ShipmentStatus } from '@/types/shipment';

const ALLOWED_ROLES = [UserRole.WAREHOUSE_OPERATOR, UserRole.OPERATIONS_MANAGER, UserRole.ADMIN];

// useSearchParams() requires a Suspense boundary - same reasoning as the
// admin product edit page and inventory/edit page.
export default function ShipmentDetailPage() {
  return (
    <Suspense fallback={null}>
      <ShipmentDetailForm />
    </Suspense>
  );
}

function ShipmentDetailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shipmentId = searchParams?.get('id') ?? '';
  const { user, token, loading: authLoading } = useAuth();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [error, setError] = useState('');

  const [newStatus, setNewStatus] = useState<ShipmentStatus>(ShipmentStatus.CREATED);
  const [savingStatus, setSavingStatus] = useState(false);

  const [trackingNumber, setTrackingNumber] = useState('');
  const [savingTracking, setSavingTracking] = useState(false);

  function refreshShipment(currentToken: string) {
    return getShipment(currentToken, shipmentId).then((data) => {
      setShipment(data);
      setNewStatus(data.status);
      setTrackingNumber(data.trackingNumber ?? '');
    });
  }

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && !ALLOWED_ROLES.includes(user.role)) { router.push('/dashboard/customer'); return; }
    if (!shipmentId) { router.push('/dashboard/warehouse/shipments'); return; }

    refreshShipment(token).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load shipment'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, authLoading, router, shipmentId]);

  async function handleUpdateStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');
    setSavingStatus(true);
    try {
      await updateShipmentStatus(token, shipmentId, newStatus);
      await refreshShipment(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleUpdateTracking(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !trackingNumber.trim()) return;
    setError('');
    setSavingTracking(true);
    try {
      await updateTrackingNumber(token, shipmentId, trackingNumber.trim());
      await refreshShipment(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tracking number');
    } finally {
      setSavingTracking(false);
    }
  }

  if (!user || !ALLOWED_ROLES.includes(user.role)) return null;

  if (!shipment) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6, pb: 6 }}>
      <Box sx={{ width: 480 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Shipment Detail</Typography>
          <Button variant="outlined" size="small" onClick={() => router.push('/dashboard/warehouse/shipments')}>
            Back to Queue
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Typography variant="body2" color="text.secondary">Order ID</Typography>
        <Typography sx={{ fontFamily: 'monospace', mb: 2 }}>{shipment.orderId}</Typography>

        <Typography variant="body2" color="text.secondary">Current Status</Typography>
        <Chip label={shipment.status} sx={{ mb: 2 }} />

        <Typography variant="body2" color="text.secondary">Shipped Date</Typography>
        <Typography sx={{ mb: 2 }}>
          {shipment.shippedDate ? new Date(shipment.shippedDate).toLocaleString() : 'Not shipped yet'}
        </Typography>

        <Typography variant="body2" color="text.secondary">Delivered Date</Typography>
        <Typography sx={{ mb: 3 }}>
          {shipment.deliveredDate ? new Date(shipment.deliveredDate).toLocaleString() : 'Not delivered yet'}
        </Typography>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="h6" sx={{ mb: 2 }}>Update Status</Typography>
        <Box component="form" onSubmit={handleUpdateStatus} sx={{ mb: 4 }}>
          <FormControl fullWidth margin="normal">
            <InputLabel id="status-label">Status</InputLabel>
            <Select
              labelId="status-label"
              label="Status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as ShipmentStatus)}
            >
              <MenuItem value={ShipmentStatus.CREATED}>Created</MenuItem>
              <MenuItem value={ShipmentStatus.PACKED}>Packed</MenuItem>
              <MenuItem value={ShipmentStatus.SHIPPED}>Shipped</MenuItem>
              <MenuItem value={ShipmentStatus.DELIVERED}>Delivered</MenuItem>
            </Select>
          </FormControl>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            disabled={savingStatus || newStatus === shipment.status}
          >
            {savingStatus ? 'Saving...' : 'Update Status'}
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="h6" sx={{ mb: 2 }}>Tracking Number</Typography>
        <Box component="form" onSubmit={handleUpdateTracking}>
          <TextField
            label="Tracking Number"
            fullWidth
            margin="normal"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            disabled={savingTracking || !trackingNumber.trim()}
          >
            {savingTracking ? 'Saving...' : 'Update Tracking Number'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
