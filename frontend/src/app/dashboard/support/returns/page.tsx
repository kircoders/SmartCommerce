'use client';

// Phase 8

// WHAT THIS FILE IS:
// The Returns Queue at /dashboard/support/returns - SUPPORT_AGENT,
// OPERATIONS_MANAGER, ADMIN only. Every return, most recently updated
// first, with a status filter that's sent to the backend (?status=...).
// The filter starts from the URL, so a dashboard button can link straight
// to e.g. the returns waiting for review.

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
import { getReturnQueue } from '@/lib/api/returns';
import { DASHBOARD_ROUTES, SUPPORT_STAFF_ROLES } from '@/lib/dashboard-routes';
import { RETURN_STATUS_COLORS, RETURN_STATUS_LABELS, ReturnRequest, ReturnStatus } from '@/types/returns';

function parseStatus(value: string | null | undefined): ReturnStatus | '' {
  return Object.values(ReturnStatus).find((s) => s === value) ?? '';
}

// useSearchParams() requires a Suspense boundary - same reasoning as the
// shipment detail page.
export default function ReturnsQueuePage() {
  return (
    <Suspense fallback={null}>
      <ReturnsQueue />
    </Suspense>
  );
}

function ReturnsQueue() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, loading: authLoading } = useAuth();

  const [returns, setReturns] = useState<ReturnRequest[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | ''>(parseStatus(searchParams?.get('status')));
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && !SUPPORT_STAFF_ROLES.includes(user.role)) { router.push(DASHBOARD_ROUTES[user.role]); return; }

    getReturnQueue(token, statusFilter || undefined)
      .then(setReturns)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load returns'));
  }, [token, user, authLoading, router, statusFilter]);

  if (!user || !SUPPORT_STAFF_ROLES.includes(user.role)) return null;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Returns</Typography>
        <Button variant="outlined" onClick={() => router.push(DASHBOARD_ROUTES[user.role])}>
          Back to Dashboard
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <FormControl size="small" sx={{ width: 220, mb: 3 }}>
        <InputLabel id="status-filter-label">Status</InputLabel>
        <Select
          labelId="status-filter-label"
          label="Status"
          value={statusFilter}
          onChange={(e) => { setReturns(null); setStatusFilter(e.target.value as ReturnStatus | ''); }}
        >
          <MenuItem value="">All</MenuItem>
          {Object.values(ReturnStatus).map((status) => (
            <MenuItem key={status} value={status}>{RETURN_STATUS_LABELS[status]}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {!returns ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      ) : returns.length === 0 ? (
        <Typography color="text.secondary">No returns match this filter.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>Order</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Requested</TableCell>
                <TableCell>Last Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {returns.map((ret) => (
                <TableRow
                  key={ret.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/dashboard/support/returns/detail?id=${ret.id}`)}
                >
                  <TableCell>{ret.customer ? `${ret.customer.firstName} ${ret.customer.lastName}` : '—'}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>#{ret.orderId.slice(0, 8)}</TableCell>
                  <TableCell sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ret.reason}
                  </TableCell>
                  <TableCell>
                    <Chip label={RETURN_STATUS_LABELS[ret.status]} size="small" color={RETURN_STATUS_COLORS[ret.status]} />
                  </TableCell>
                  <TableCell>{new Date(ret.requestedAt).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(ret.updatedAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
