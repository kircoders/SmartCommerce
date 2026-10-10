'use client';

// Next.js automatically uses this file for any URL under /products that
// doesn't match a real route (e.g. /products/anything-that-does-not-exist).
// If this file didn't exist, Next would fall back to the closest one going
// up the folder tree instead - in this app, that's app/not-found.tsx.

import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export default function ProductsNotFound() {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h4" sx={{ mb: 2 }}>404 - Product Page Not Found</Typography>
      <Typography sx={{ mb: 3 }}>That product page doesn&apos;t exist.</Typography>
      <Button component={Link} href="/products" variant="contained">Back to Products</Button>
    </Box>
  );
}
