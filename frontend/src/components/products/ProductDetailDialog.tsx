'use client';

// Phase 2 / Phase 4

// WHAT THIS FILE IS:
// The product detail popup - shown when a user clicks a product card on the
// /products browse page. A MUI Dialog (modal), not a separate page/route,
// per the design: click a card -> see full details -> "Add to Cart" or
// "Close".
//
// WHY A DIALOG INSTEAD OF A DETAIL PAGE:
// Simpler, and the data's already in hand - ProductsService.findAll() on the
// backend already loads every product's full images array (not just the
// primary one), so opening the dialog doesn't need a separate API call.
// It just renders whichever product was clicked.
//
// WHAT IT SHOWS: all images (not just primary), name, price, full
// description, and a quantity selector (min 1) next to Add to Cart.
//
// BUTTONS:
// - "Add to Cart": only shown to CUSTOMER role - every other role can
//   browse /products (Phase 2), but only customers can actually have a
//   cart (the backend's RolesGuard would 403 anyone else), so there's no
//   point showing a button that would just fail for them. Calls
//   POST /cart/items with the selected quantity; shows a success message
//   on the dialog itself rather than closing it, so you can keep adjusting
//   quantity and add more without reopening.
// - "Close": closes the dialog, nothing else.

import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';
import { addToCart } from '@/lib/api/cart';
import { Product } from '@/types/product';

interface ProductDetailDialogProps {
  product: Product | null;
  onClose: () => void;
}

export default function ProductDetailDialog({ product, onClose }: ProductDetailDialogProps) {
  const { user, token } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isOutOfStock = product ? product.quantityAvailable === 0 : false;
  const isLowStock = product ? !isOutOfStock && product.quantityAvailable <= product.lowStockThreshold : false;
  const isCustomer = user?.role === UserRole.CUSTOMER;

  // Reset back to 1, and clear any leftover success/error message, every
  // time a different product is opened.
  useEffect(() => {
    setQuantity(1);
    setError('');
    setSuccess(false);
  }, [product?.id]);

  function handleQuantityChange(value: string) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    setQuantity(Math.max(1, Math.floor(parsed)));
  }

  async function handleAddToCart() {
    if (!token || !product) return;
    setError('');
    setSuccess(false);
    setAdding(true);
    try {
      await addToCart(token, product.id, quantity);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
    } finally {
      setAdding(false);
    }
  }

  return (
    <Dialog open={Boolean(product)} onClose={onClose} maxWidth="sm" fullWidth>
      {product && (
        <>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogContent>
            {product.images.length > 0 ? (
              <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', mb: 2 }}>
                {product.images.map((image) => (
                  <Box
                    key={image.id}
                    component="img"
                    src={image.url}
                    alt={product.name}
                    sx={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
                  />
                ))}
              </Box>
            ) : (
              <Box
                sx={{
                  height: 160,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">No image</Typography>
              </Box>
            )}

            {isOutOfStock ? (
              <Chip label="We'll restock soon!" color="warning" sx={{ mb: 1 }} />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <Typography variant="h6">
                  ${Number(product.price).toFixed(2)}
                </Typography>
                {isLowStock ? (
                  <Chip label={`Get it now, only ${product.quantityAvailable} left!`} color="warning" />
                ) : (
                  <Chip label="IN STOCK" color="success" variant="outlined" />
                )}
              </Box>
            )}

            {product.description && (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {product.description}
              </Typography>
            )}

            {success && <Alert severity="success" sx={{ mb: 1 }}>Added to cart!</Alert>}
            {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Close</Button>
            {isCustomer && !isOutOfStock && (
              <>
                <TextField
                  type="number"
                  size="small"
                  label="Qty"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  slotProps={{ htmlInput: { min: 1 } }}
                  sx={{ width: 80 }}
                />
                <Button variant="contained" onClick={handleAddToCart} disabled={adding}>
                  {adding ? 'Adding...' : 'Add to Cart'}
                </Button>
              </>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
