'use client';

// Next.js automatically uses this file as the error boundary for everything
// under /products - if page.tsx (or anything it renders) throws during
// render, Next swaps this in instead, passing the real error plus a reset()
// function that retries rendering the page from scratch.

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export default function ProductsError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h6">Something went wrong loading products.</Typography>
      <Button onClick={reset}>Try again</Button>
    </Box>
  );
}
