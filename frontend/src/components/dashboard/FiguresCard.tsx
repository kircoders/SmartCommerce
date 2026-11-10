'use client';

// Phase 10

// WHAT THIS FILE IS:
// A titled card of labeled numbers in a grid - "Inventory summary",
// "Revenue", "Users by role". `figures: null` means still loading.

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

export interface Figure {
  label: string;
  value: string | number;
  color?: 'error.main' | 'warning.main' | 'success.main';
}

export default function FiguresCard({ title, figures }: { title: string; figures: Figure[] | null }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>{title}</Typography>
        {figures === null ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {figures.map((f) => (
              <Box key={f.label}>
                <Typography variant="h5" sx={{ color: f.color ?? 'text.primary' }}>
                  {typeof f.value === 'number' ? f.value.toLocaleString() : f.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">{f.label}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
