'use client';

// Phase 2

// WHAT THIS FILE IS:
// A single product card - the "IMG / NAME / DESC" box from the catalog
// sketch. Reused in two places: the public /products browse page (view-only)
// and the admin /dashboard/admin/products page (with Edit/Delete buttons).
//
// WHY IT'S ONE SHARED COMPONENT INSTEAD OF TWO:
// The card itself (image, name, price, description) looks identical either
// way - the only difference is whether admin action buttons are shown. That
// difference is controlled entirely by whether onEdit/onDelete are passed in.
//
// WHAT IT DOES:
// - Shows the primary image if one exists, otherwise a plain placeholder box
// - Shows name, formatted price, and a truncated description
// - Phase 3: shows a stock chip alongside/instead of price -
//   "We'll restock soon!" (friendly wording, not a blunt "OUT OF STOCK")
//   when quantityAvailable is 0, "Get it now, only N left!" urgency
//   messaging when low but not zero, "IN STOCK" otherwise. Same three
//   states as the internal /inventory list, just worded for customers.
// - Clicking the card (outside the admin buttons) calls onClick, if provided
// - If onEdit/onDelete are passed, renders Edit/Delete buttons that stop the
//   click from also triggering onClick (so clicking "Delete" doesn't also
//   navigate to the detail page)

import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ProductCard({ product, onClick, onEdit, onDelete }: ProductCardProps) {
  const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0];
  const isAdmin = Boolean(onEdit || onDelete);
  const isOutOfStock = product.quantityAvailable === 0;
  const isLowStock = !isOutOfStock && product.quantityAvailable <= product.lowStockThreshold;

  const content = (
    <>
      {primaryImage ? (
        <CardMedia
          component="img"
          image={primaryImage.url}
          alt={product.name}
          sx={{ height: 160, objectFit: 'cover' }}
        />
      ) : (
        <Box
          sx={{
            height: 160,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">No image</Typography>
        </Box>
      )}
      <CardContent>
        <Typography variant="subtitle1" noWrap>{product.name}</Typography>
        {isOutOfStock ? (
          <Chip label="We'll restock soon!" size="small" color="warning" sx={{ mb: 1 }} />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              ${Number(product.price).toFixed(2)}
            </Typography>
            {isLowStock ? (
              <Chip label={`Get it now, only ${product.quantityAvailable} left!`} size="small" color="warning" />
            ) : (
              <Chip label="IN STOCK" size="small" color="success" variant="outlined" />
            )}
          </Box>
        )}
        {product.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.description}
          </Typography>
        )}
      </CardContent>
    </>
  );

  return (
    <Card sx={{ width: 220 }}>
      {onClick ? <CardActionArea onClick={onClick}>{content}</CardActionArea> : content}
      {isAdmin && (
        <CardActions>
          {onEdit && (
            <Button size="small" onClick={onEdit}>Edit</Button>
          )}
          {onDelete && (
            <Button size="small" color="error" onClick={onDelete}>Delete</Button>
          )}
        </CardActions>
      )}
    </Card>
  );
}
