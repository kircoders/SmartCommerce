'use client';

// The app-wide fallback for any URL that doesn't match a real route, and
// doesn't have a more specific not-found.tsx of its own closer to it (like
// products/not-found.tsx). Next always uses the nearest one available.

import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export default function NotFound() {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h4" sx={{ mb: 2 }}>404 - Page Not Found</Typography>
      <Typography sx={{ mb: 3 }}>This page doesn&apos;t exist.</Typography>
      <Button component={Link} href="/" variant="contained">Back to Home</Button>
    </Box>
  );
}
