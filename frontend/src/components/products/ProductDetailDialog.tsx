'use client';

// Phase 2

// WHAT THIS FILE IS:
// The product detail popup - shown when a user clicks a product card on the
// /products browse page. A MUI Dialog (modal), not a separate page/route,
// per the design: click a card -> see full details -> "Buy" or "Close".
//
// WHY A DIALOG INSTEAD OF A DETAIL PAGE:
// Simpler, and the data's already in hand - ProductsService.findAll() on the
// backend already loads every product's full images array (not just the
// primary one), so opening the dialog doesn't need a separate API call.
// It just renders whichever product was clicked.
//
// WHAT IT SHOWS: all images (not just primary), name, price, full
// description.
//
// BUTTONS:
// - "Buy": intentionally a dead end for now - no checkout/cart flow exists
//   yet, so it does nothing. Wiring it up is future-phase work.
// - "Close": closes the dialog, nothing else.

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Product } from '@/types/product';

interface ProductDetailDialogProps {
  product: Product | null;
  onClose: () => void;
}

export default function ProductDetailDialog({ product, onClose }: ProductDetailDialogProps) {
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

            <Typography variant="h6" sx={{ mb: 1 }}>
              ${Number(product.price).toFixed(2)}
            </Typography>

            {product.description && (
              <Typography variant="body1" color="text.secondary">
                {product.description}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Close</Button>
            <Button variant="contained">Buy</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
