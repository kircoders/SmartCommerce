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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          ${Number(product.price).toFixed(2)}
        </Typography>
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
