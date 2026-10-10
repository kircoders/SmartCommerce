'use client';

// Phase 4

// WHAT THIS FILE IS:
// The shopping cart page at /cart - CUSTOMER only (matches the backend's
// RolesGuard on every /api/cart route). Table: product (with thumbnail),
// price per unit, editable quantity, and that row's total (price *
// quantity) - plus a grand total across the whole cart.
//
// WHAT IT DOES:
// 1. Checks the user is logged in and is a CUSTOMER - redirects everyone
//    else to their own dashboard, same as they'd get a 403 hitting the
//    API directly.
// 2. Fetches the cart on load.
// 3. Changing a row's quantity calls PUT /cart/items/:id and replaces the
//    cart with whatever the backend actually saved (picks up server-side
//    validation, like the "only N available" guard).
// 4. Removing a row calls DELETE /cart/items/:id.
// 5. "Clear Cart" empties everything via DELETE /cart.
// 6. "Proceed to Checkout" navigates to /checkout (not built yet).

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
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';
import { getCart, updateCartItem, removeCartItem, clearCart } from '@/lib/api/cart';
import { Cart } from '@/types/cart';

const DASHBOARD_ROUTES: Record<string, string> = {
  CUSTOMER: '/dashboard/customer',
  SUPPORT_AGENT: '/dashboard/support',
  WAREHOUSE_OPERATOR: '/dashboard/warehouse',
  OPERATIONS_MANAGER: '/dashboard/operations',
  ADMIN: '/dashboard/admin',
};

export default function CartPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clearing, setClearing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  function refreshCart(currentToken: string) {
    return getCart(currentToken).then(setCart);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && user.role !== UserRole.CUSTOMER) {
      router.push(DASHBOARD_ROUTES[user.role]);
      return;
    }

    refreshCart(token)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load cart'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, authLoading, router]);

  async function handleQuantityChange(itemId: string, value: string) {
    if (!token) return;
    const quantity = Math.max(1, Math.floor(Number(value)));
    if (Number.isNaN(quantity)) return;
    setError('');
    try {
      const updated = await updateCartItem(token, itemId, quantity);
      setCart(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quantity');
    }
  }

  async function handleRemove(itemId: string) {
    if (!token) return;
    if (!confirm('Remove this item from your cart?')) return;
    setError('');
    try {
      const updated = await removeCartItem(token, itemId);
      setCart(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item');
    }
  }

  // Manual refresh - reuses the same refreshCart() the initial page load
  // already calls, just triggered by a button instead of on mount. Useful
  // if stock changed elsewhere (another tab, another device) and the user
  // wants to see current numbers without a full page reload.
  async function handleRefresh() {
    if (!token) return;
    setError('');
    setRefreshing(true);
    try {
      await refreshCart(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh cart');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleClear() {
    if (!token) return;
    if (!confirm('Clear your entire cart?')) return;
    setError('');
    setClearing(true);
    try {
      const updated = await clearCart(token);
      setCart(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cart');
    } finally {
      setClearing(false);
    }
  }

  // Previously this just returned null while loading - a blank page with
  // no indication anything was happening. Now shows a spinner instead, so
  // the user knows the cart is actually being fetched, not just broken.
  if (!user || user.role !== UserRole.CUSTOMER) return null;
  if (!cart) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const grandTotal = cart.items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">My Cart</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleRefresh}
            disabled={refreshing}
            startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
          >
            Refresh
          </Button>
          <Button variant="outlined" onClick={() => router.push('/products')}>
            Back to Products
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && cart.items.length === 0 && (
        <Typography color="text.secondary">
          Your cart is empty. <Button onClick={() => router.push('/products')}>Browse products</Button>
        </Typography>
      )}

      {cart.items.length > 0 && (
        <>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cart.items.map((item) => {
                  const primaryImage = item.product.images.find((img) => img.isPrimary) ?? item.product.images[0];
                  const lineTotal = Number(item.unitPrice) * item.quantity;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {primaryImage ? (
                            <Box
                              component="img"
                              src={primaryImage.url}
                              alt={item.product.name}
                              sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 1 }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                bgcolor: 'action.hover',
                                borderRadius: 1,
                              }}
                            />
                          )}
                          <Typography variant="body2">{item.product.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">${Number(item.unitPrice).toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                          slotProps={{ htmlInput: { min: 1, style: { textAlign: 'right' } } }}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell align="right">${lineTotal.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleRemove(item.id)} aria-label="Remove item">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell colSpan={3} />
                  <TableCell align="right">
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      ${grandTotal.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleClear}
              disabled={clearing}
              startIcon={clearing ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              Clear Cart
            </Button>
            <Button variant="contained" onClick={() => router.push('/checkout')}>
              Proceed to Checkout
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
