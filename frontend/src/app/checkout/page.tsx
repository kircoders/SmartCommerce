'use client';

// Phase 4

// WHAT THIS FILE IS:
// The checkout confirmation screen at /checkout - CUSTOMER only. A
// read-only review of the cart (no quantity editing, no remove buttons -
// that's what /cart is for), plus a live stock re-check.
//
// WHAT IT DOES:
// 1. Checks the user is logged in and is a CUSTOMER.
// 2. Fetches the checkout summary (GET /checkout - same data as the cart)
//    AND runs a stock validation (POST /checkout/validate) at the same
//    time on load.
// 3. If validation finds problems (something in the cart now exceeds
//    current stock), shows exactly which product and why, instead of a
//    generic error.
// 4. "Confirm Order" is intentionally a dead end - there's no order
//    creation yet (that's Phase 5). It's disabled if validation failed,
//    so at least you can't "confirm" something already known to be
//    unavailable.

import { useEffect, useState } from 'react';
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
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';
import { getCheckout, validateCheckout } from '@/lib/api/checkout';
import { Cart, CheckoutValidation } from '@/types/cart';

const DASHBOARD_ROUTES: Record<string, string> = {
  CUSTOMER: '/dashboard/customer',
  SUPPORT_AGENT: '/dashboard/support',
  WAREHOUSE_OPERATOR: '/dashboard/warehouse',
  OPERATIONS_MANAGER: '/dashboard/operations',
  ADMIN: '/dashboard/admin',
};

export default function CheckoutPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [validation, setValidation] = useState<CheckoutValidation | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && user.role !== UserRole.CUSTOMER) {
      router.push(DASHBOARD_ROUTES[user.role]);
      return;
    }

    Promise.all([getCheckout(token), validateCheckout(token)])
      .then(([cartData, validationData]) => {
        setCart(cartData);
        setValidation(validationData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load checkout'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, authLoading, router]);

  if (!user || user.role !== UserRole.CUSTOMER || !cart) return null;

  const grandTotal = cart.items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );

  // Cross-reference validation issues (just productId/requested/available)
  // against the cart's items to show an actual product name, not a bare id.
  function issueFor(productId: string) {
    return validation?.issues.find((issue) => issue.productId === productId);
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Checkout</Typography>
        <Button variant="outlined" onClick={() => router.push('/cart')}>
          Back to Cart
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {validation && !validation.valid && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Some items in your cart are no longer available in the quantity you requested:
          <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
            {validation.issues.map((issue) => {
              const item = cart.items.find((i) => i.productId === issue.productId);
              return (
                <li key={issue.productId}>
                  {item?.product.name ?? issue.productId}: you requested {issue.requested}, only{' '}
                  {issue.available} available
                </li>
              );
            })}
          </ul>
        </Alert>
      )}

      {cart.items.length === 0 ? (
        <Typography color="text.secondary">Your cart is empty.</Typography>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cart.items.map((item) => {
                  const lineTotal = Number(item.unitPrice) * item.quantity;
                  const issue = issueFor(item.productId);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.product.name}
                        {issue && (
                          <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                            Only {issue.available} available
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">${Number(item.unitPrice).toFixed(2)}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">${lineTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell colSpan={2} />
                  <TableCell align="right">
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Total</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      ${grandTotal.toFixed(2)}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="large"
              disabled={Boolean(validation && !validation.valid)}
            >
              Confirm Order
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 1 }}>
            Order placement isn&apos;t available yet - this is a preview only.
          </Typography>
        </>
      )}
    </Box>
  );
}
