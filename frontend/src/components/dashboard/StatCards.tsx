'use client';

// Phase 10

// WHAT THIS FILE IS:
// The row of number cards at the top of every dashboard ("4 waiting to
// pack"). A card with an `href` is clickable and opens the page behind
// that number; `value: null` shows a dash while the data loads.

import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

export interface StatCard {
  label: string;
  value: number | string | null;
  href?: string;
  // Turns the number red/orange/green - e.g. red when critical incidents > 0.
  color?: 'error.main' | 'warning.main' | 'success.main';
  caption?: string;
}

export default function StatCards({ cards }: { cards: StatCard[] }) {
  const router = useRouter();

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: `repeat(${Math.min(cards.length, 4)}, 1fr)` },
        gap: 2,
        mb: 3,
      }}
    >
      {cards.map((card) => {
        const content = (
          <CardContent>
            <Typography variant="h4" sx={{ color: card.color ?? 'text.primary' }}>
              {card.value ?? '–'}
            </Typography>
            <Typography color="text.secondary">{card.label}</Typography>
            {card.caption && (
              <Typography variant="caption" color="text.secondary">{card.caption}</Typography>
            )}
          </CardContent>
        );
        return (
          <Card key={card.label} variant="outlined" sx={{ height: '100%' }}>
            {card.href ? (
              // CardActionArea centers its contents vertically by default -
              // top-align so clickable and plain cards line up.
              <CardActionArea
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' }}
                onClick={() => card.href && router.push(card.href)}
              >
                {content}
              </CardActionArea>
            ) : (
              content
            )}
          </Card>
        );
      })}
    </Box>
  );
}
