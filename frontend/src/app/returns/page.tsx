'use client';

// Phase 8

// WHAT THIS FILE IS:
// "My Returns" at /returns - CUSTOMER only. Every return this customer has
// requested, most recently updated first (matches the backend's
// findAllForCustomer() ordering), with its status and refund. Clicking a
// row opens its details (?id=..., same query-param pattern as every other
// detail page in this static-export app).

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
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';
import { getMyReturns } from '@/lib/api/returns';
import { DASHBOARD_ROUTES } from '@/lib/dashboard-routes';
import { RETURN_STATUS_COLORS, RETURN_STATUS_LABELS, ReturnRequest } from '@/types/returns';

export default function MyReturnsPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [returns, setReturns] = useState<ReturnRequest[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && user.role !== UserRole.CUSTOMER) { router.push(DASHBOARD_ROUTES[user.role]); return; }

    getMyReturns(token)
      .then(setReturns)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load returns'));
  }, [token, user, authLoading, router]);

  if (!user || user.role !== UserRole.CUSTOMER) return null;

  if (!returns && !error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">My Returns</Typography>
        <Box>
          <Button variant="contained" onClick={() => router.push('/returns/new')} sx={{ mr: 2 }}>
            Request a Return
          </Button>
          <Button variant="outlined" onClick={() => router.push('/dashboard/customer')}>
            Back to Dashboard
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {returns && returns.length === 0 ? (
        <Typography color="text.secondary">
          You haven&apos;t requested any returns. Items from delivered orders can be returned from{' '}
          <Button onClick={() => router.push('/orders')}>My Orders</Button>
        </Typography>
      ) : returns && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order</TableCell>
                <TableCell>Requested</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Refund</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {returns.map((ret) => (
                <TableRow
                  key={ret.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/returns/detail?id=${ret.id}`)}
                >
                  <TableCell sx={{ fontFamily: 'monospace' }}>#{ret.orderId.slice(0, 8)}</TableCell>
                  <TableCell>{new Date(ret.requestedAt).toLocaleDateString()}</TableCell>
                  <TableCell sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ret.reason}
                  </TableCell>
                  <TableCell>
                    <Chip label={RETURN_STATUS_LABELS[ret.status]} size="small" color={RETURN_STATUS_COLORS[ret.status]} />
                  </TableCell>
                  <TableCell align="right">
                    {ret.refund ? `$${Number(ret.refund.amount).toFixed(2)}` : '—'}
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
