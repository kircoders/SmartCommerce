'use client';

// Phase 10

// WHAT THIS FILE IS:
// A titled card holding a short list - "Recent orders", "Low stock",
// "Assigned to me". Each row has a main line, a smaller line under it, and
// an optional status chip on the right; a row with an `href` is clickable.
// `rows: null` means still loading. `action` adds a "View all" style link
// in the card's header.

import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

export type ChipColor = 'default' | 'info' | 'warning' | 'success' | 'error';

export interface ListRow {
  key: string;
  primary: string;
  secondary?: string;
  chip?: { label: string; color: ChipColor };
  href?: string;
}

interface ListCardProps {
  title: string;
  rows: ListRow[] | null;
  emptyText: string;
  action?: { label: string; href: string };
}

export default function ListCard({ title, rows, emptyText, action }: ListCardProps) {
  const router = useRouter();

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">{title}</Typography>
          {action && (
            <Button size="small" onClick={() => router.push(action.href)}>{action.label}</Button>
          )}
        </Box>

        {rows === null ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary">{emptyText}</Typography>
        ) : (
          <List dense disablePadding>
            {rows.map((row) => {
              const text = <ListItemText primary={row.primary} secondary={row.secondary} />;
              const chip = row.chip && (
                <Chip label={row.chip.label} color={row.chip.color} size="small" variant="outlined" sx={{ ml: 1 }} />
              );
              return row.href ? (
                <ListItem key={row.key} disablePadding>
                  <ListItemButton onClick={() => row.href && router.push(row.href)} sx={{ px: 1 }}>
                    {text}
                    {chip}
                  </ListItemButton>
                </ListItem>
              ) : (
                <ListItem key={row.key} sx={{ px: 1 }}>
                  {text}
                  {chip}
                </ListItem>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
