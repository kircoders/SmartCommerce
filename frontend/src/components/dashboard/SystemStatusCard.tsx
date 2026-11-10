'use client';

// Phase 10

// WHAT THIS FILE IS:
// "Basic system status" on the operations and admin dashboards. The API is
// up if this loaded at all; the backend times a tiny database query and
// reports whether it answered and how long it took.

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { SystemStatus } from '@/types/dashboard';

export default function SystemStatusCard({ status }: { status: SystemStatus }) {
  const dbUp = status.database === 'UP';
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>System status</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip label="API: Up" color="success" variant="outlined" />
          <Chip
            label={dbUp ? `Database: Up (${status.databaseLatencyMs} ms)` : 'Database: Down'}
            color={dbUp ? 'success' : 'error'}
            variant="outlined"
          />
          <Typography variant="body2" color="text.secondary">
            Checked {new Date(status.checkedAt).toLocaleTimeString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
