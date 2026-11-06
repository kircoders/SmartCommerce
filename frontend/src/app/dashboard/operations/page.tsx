'use client';

// Phase 1


// WHAT THIS FILE IS:
// The Operations Manager Dashboard — what an OPERATIONS_MANAGER role user sees after logging in.
// Placeholder for Phase 1. In Phase 10 (Reporting & Role-Based Dashboards), this will show
// KPIs, business reports, operational summaries, analytics, etc.
//
// WHAT IT DOES:
// 1. Checks if the user is logged in. If not, redirects to /login.
// 2. Displays a welcome message with the user's first name and role
// 3. Provides a Logout button
//
// Phase 9 added the incident summary - open (open or in progress),
// critical (still unresolved), and resolved in the last 7 days. Open and
// critical link to the Incidents page with that filter already applied.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/lib/api/auth';
import AnnouncementBanner from '@/components/ui/AnnouncementBanner';
import { getIncidentSummary } from '@/lib/api/incidents';
import { IncidentSummary } from '@/types/incident';

interface SummaryCard {
  label: string;
  value: number;
  color: 'text.primary' | 'error.main' | 'success.main';
  href?: string;
}

export default function OperationsDashboard() {
  const router = useRouter();
  const { user, token, loading, clearAuth } = useAuth();
  const [summary, setSummary] = useState<IncidentSummary | null>(null);

  useEffect(() => {
    if (!loading && !token) router.push('/login');
    // The summary is a nice-to-have - if it fails the dashboard still works.
    if (token) getIncidentSummary(token).then(setSummary).catch(() => setSummary(null));
  }, [token, loading, router]);

  async function handleLogout() {
    if (token) await logout(token);
    clearAuth();
    router.push('/login');
  }

  if (!user) return null;

  const cards: SummaryCard[] = summary
    ? [
        { label: 'Open incidents', value: summary.open, color: 'text.primary', href: '/dashboard/incidents?status=UNRESOLVED' },
        {
          label: 'Critical',
          value: summary.critical,
          color: summary.critical > 0 ? 'error.main' : 'text.primary',
          href: '/dashboard/incidents?status=UNRESOLVED&severity=CRITICAL',
        },
        { label: 'Resolved this week', value: summary.recentlyResolved, color: 'success.main' },
      ]
    : [];

  return (
    <Box>
      <AnnouncementBanner />
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" sx={{ mb: 2 }}>Operations Dashboard</Typography>
          <Typography variant="body1" sx={{ mb: 4 }}>
            Welcome, {user.firstName}! You are logged in as {user.role}.
          </Typography>
          {cards.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
              {cards.map((card) => {
                const content = (
                  <CardContent>
                    <Typography variant="h3" sx={{ color: card.color }}>{card.value}</Typography>
                    <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                  </CardContent>
                );
                return (
                  <Card key={card.label} variant="outlined" sx={{ width: 180 }}>
                    {card.href ? (
                      <CardActionArea onClick={() => card.href && router.push(card.href)}>{content}</CardActionArea>
                    ) : (
                      content
                    )}
                  </Card>
                );
              })}
            </Box>
          )}
          <Button variant="outlined" onClick={() => router.push('/products')} sx={{ mr: 2 }}>Browse Products</Button>
          <Button variant="outlined" onClick={() => router.push('/inventory')} sx={{ mr: 2 }}>Inventory</Button>
          <Button variant="outlined" onClick={() => router.push('/dashboard/warehouse/shipments')} sx={{ mr: 2 }}>Shipments</Button>
          <Button variant="outlined" onClick={() => router.push('/dashboard/support/returns')} sx={{ mr: 2 }}>Returns</Button>
          <Button variant="outlined" onClick={() => router.push('/dashboard/incidents')} sx={{ mr: 2 }}>Incidents</Button>
          <Button variant="outlined" onClick={handleLogout}>Logout</Button>
        </Box>
      </Box>
    </Box>
  );
}
