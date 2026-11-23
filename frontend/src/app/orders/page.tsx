'use client';

// Phase 5

// WHAT THIS FILE IS:
// The "My Orders" list at /orders - CUSTOMER only. Read-only history of
// every order this customer has ever placed, newest first (matches the
// backend's OrdersService.findAllForCustomer() ordering). Each row expands
// (click the arrow) to show that order's items - product name, quantity,
// unit price, line total - pulled from the same order.items the backend
// now includes (see findAllForCustomer()'s relations option).
//
// Phase 12 - orders that haven't shipped yet (PLACED or PROCESSING) get a
// "Cancel order" button, with an "are you sure?" popup first. Cancelling
// gives the stock back; the backend double-checks it hasn't shipped.

import { Fragment, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';
import { cancelOrder, getOrders } from '@/lib/api/orders';
import { getShipmentForOrder } from '@/lib/api/shipments';
import { Order, OrderStatus } from '@/types/order';
import { Shipment } from '@/types/shipment';

const DASHBOARD_ROUTES: Record<string, string> = {
  CUSTOMER: '/dashboard/customer',
  SUPPORT_AGENT: '/dashboard/support',
  WAREHOUSE_OPERATOR: '/dashboard/warehouse',
  OPERATIONS_MANAGER: '/dashboard/operations',
  ADMIN: '/dashboard/admin',
};

const STATUS_COLORS: Record<OrderStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  [OrderStatus.PLACED]: 'default',
  [OrderStatus.PROCESSING]: 'info',
  [OrderStatus.SHIPPED]: 'warning',
  [OrderStatus.DELIVERED]: 'success',
  [OrderStatus.CANCELLED]: 'error',
};

export default function OrdersPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');
  // Which order rows are currently expanded - a Set so multiple can be
  // open at once, independent of each other.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Shipment info is fetched lazily, only once a row is actually expanded -
  // no reason to make N extra requests for orders the customer never
  // bothers to open. Keyed by orderId so each row's fetch is independent.
  const [shipments, setShipments] = useState<Record<string, Shipment | undefined>>({});
  // Phase 12 - the order waiting in the "are you sure?" popup, if any.
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && user.role !== UserRole.CUSTOMER) {
      router.push(DASHBOARD_ROUTES[user.role]);
      return;
    }

    getOrders(token)
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load orders'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, authLoading, router]);

  function toggleExpanded(orderId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });

    // Fetch the shipment the first time this row is opened - not on every
    // toggle, and not for rows that are never expanded at all.
    if (!expanded.has(orderId) && !shipments[orderId] && token) {
      getShipmentForOrder(token, orderId)
        .then((shipment) => setShipments((prev) => ({ ...prev, [orderId]: shipment })))
        .catch(() => {
          // A missing shipment isn't worth its own error Alert here - the
          // item table below still renders fine without it.
        });
    }
  }

  async function confirmCancel() {
    if (!token || !cancelling) return;
    setCancelBusy(true);
    setCancelError('');
    try {
      const updated = await cancelOrder(token, cancelling.id);
      setOrders((prev) => prev?.map((o) => (o.id === updated.id ? updated : o)) ?? prev);
      // Re-fetch the shipment so its chip shows CANCELLED too.
      getShipmentForOrder(token, updated.id)
        .then((shipment) => setShipments((prev) => ({ ...prev, [updated.id]: shipment })))
        .catch(() => {});
      setCancelling(null);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setCancelBusy(false);
    }
  }

  if (!user || user.role !== UserRole.CUSTOMER) return null;
  if (!orders) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">My Orders</Typography>
        <Button variant="outlined" onClick={() => router.push('/products')}>
          Back to Products
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {orders.length === 0 ? (
        <Typography color="text.secondary">
          You haven&apos;t placed any orders yet.{' '}
          <Button onClick={() => router.push('/products')}>Browse products</Button>
        </Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Order ID</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => {
                const isOpen = expanded.has(order.id);
                return (
                  <Fragment key={order.id}>
                    <TableRow>
                      <TableCell sx={{ width: 48 }}>
                        <IconButton size="small" onClick={() => toggleExpanded(order.id)}>
                          {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{order.id}</TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip label={order.status} size="small" color={STATUS_COLORS[order.status]} />
                      </TableCell>
                      <TableCell align="right">${Number(order.totalAmount).toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 0, borderBottom: isOpen ? undefined : 'none' }}>
                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                          <Box sx={{ my: 2 }}>
                            {shipments[order.id] && (
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2">
                                  Shipment: <Chip label={shipments[order.id]!.status} size="small" sx={{ ml: 1 }} />
                                </Typography>
                                {shipments[order.id]!.trackingNumber && (
                                  <Typography variant="body2" color="text.secondary">
                                    Tracking Number: {shipments[order.id]!.trackingNumber}
                                  </Typography>
                                )}
                              </Box>
                            )}
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Product</TableCell>
                                  <TableCell align="right">Quantity</TableCell>
                                  <TableCell align="right">Unit Price</TableCell>
                                  <TableCell align="right">Line Total</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {(order.items ?? []).map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>{item.productName}</TableCell>
                                    <TableCell align="right">{item.quantity}</TableCell>
                                    <TableCell align="right">${Number(item.unitPrice).toFixed(2)}</TableCell>
                                    <TableCell align="right">
                                      ${(Number(item.unitPrice) * item.quantity).toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            {/* Phase 7 - opens Contact Support with this order pre-selected.
                                Phase 8 - delivered orders can also be returned. */}
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                              {(order.status === OrderStatus.PLACED || order.status === OrderStatus.PROCESSING) && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() => { setCancelError(''); setCancelling(order); }}
                                >
                                  Cancel order
                                </Button>
                              )}
                              {order.status === OrderStatus.DELIVERED && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => router.push(`/returns/new?orderId=${order.id}`)}
                                >
                                  Request a return
                                </Button>
                              )}
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => router.push(`/support/new?orderId=${order.id}`)}
                              >
                                Get help with this order
                              </Button>
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={cancelling !== null} onClose={() => !cancelBusy && setCancelling(null)}>
        <DialogTitle>Cancel this order?</DialogTitle>
        <DialogContent>
          {cancelError && <Alert severity="error" sx={{ mb: 2 }}>{cancelError}</Alert>}
          <DialogContentText>
            {cancelling &&
              `Order #${cancelling.id.slice(0, 8)} ($${Number(cancelling.totalAmount).toFixed(2)}) will be cancelled and won't be shipped. This can't be undone.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelling(null)} disabled={cancelBusy}>Keep order</Button>
          <Button color="error" variant="contained" onClick={confirmCancel} disabled={cancelBusy}>
            {cancelBusy ? 'Cancelling...' : 'Cancel order'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
