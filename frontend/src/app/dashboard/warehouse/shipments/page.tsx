'use client';

// Phase 6

// WHAT THIS FILE IS:
// The warehouse shipment queue at /dashboard/warehouse/shipments -
// WAREHOUSE_OPERATOR, OPERATIONS_MANAGER, ADMIN only. Every shipment,
// newest-created first (matches the backend's findQueue() ordering),
// optionally narrowed down to one status. Clicking a row goes to the
// detail page (?id=..., same query-param pattern as inventory/edit and
// admin products/edit - see those files for why this app never uses
// dynamic [id] routes).

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
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';
import { getShipmentQueue } from '@/lib/api/shipments';
import { Shipment, ShipmentStatus } from '@/types/shipment';

const ALLOWED_ROLES = [UserRole.WAREHOUSE_OPERATOR, UserRole.OPERATIONS_MANAGER, UserRole.ADMIN];

const STATUS_COLORS: Record<ShipmentStatus, 'default' | 'info' | 'warning' | 'success'> = {
  [ShipmentStatus.CREATED]: 'default',
  [ShipmentStatus.PACKED]: 'info',
  [ShipmentStatus.SHIPPED]: 'warning',
  [ShipmentStatus.DELIVERED]: 'success',
};

export default function WarehouseShipmentsPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | ''>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && !ALLOWED_ROLES.includes(user.role)) { router.push('/dashboard/customer'); return; }

    getShipmentQueue(token, statusFilter || undefined)
      .then(setShipments)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load shipments'));
  }, [token, user, authLoading, router, statusFilter]);

  if (!user || !ALLOWED_ROLES.includes(user.role)) return null;

  if (!shipments) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Shipment Queue</Typography>
        <Button variant="outlined" onClick={() => router.push('/dashboard/warehouse')}>
          Back to Dashboard
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <FormControl size="small" sx={{ mb: 3, width: 220 }}>
        <InputLabel id="status-filter-label">Status</InputLabel>
        <Select
          labelId="status-filter-label"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ShipmentStatus | '')}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value={ShipmentStatus.CREATED}>Created</MenuItem>
          <MenuItem value={ShipmentStatus.PACKED}>Packed</MenuItem>
          <MenuItem value={ShipmentStatus.SHIPPED}>Shipped</MenuItem>
          <MenuItem value={ShipmentStatus.DELIVERED}>Delivered</MenuItem>
        </Select>
      </FormControl>

      {shipments.length === 0 ? (
        <Typography color="text.secondary">No shipments found.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Tracking Number</TableCell>
                <TableCell>Created</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {shipments.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{shipment.orderId}</TableCell>
                  <TableCell>
                    <Chip label={shipment.status} size="small" color={STATUS_COLORS[shipment.status]} />
                  </TableCell>
                  <TableCell>{shipment.trackingNumber ?? '—'}</TableCell>
                  <TableCell>{new Date(shipment.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => router.push(`/dashboard/warehouse/shipments/detail?id=${shipment.id}`)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
