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

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/lib/api/auth';
import AnnouncementBanner from '@/components/ui/AnnouncementBanner';

export default function OperationsDashboard() {
  const router = useRouter();
  const { user, token, loading, clearAuth } = useAuth();

  useEffect(() => {
    if (!loading && !token) router.push('/login');
  }, [token, loading, router]);

  async function handleLogout() {
    if (token) await logout(token);
    clearAuth();
    router.push('/login');
  }

  if (!user) return null;

  return (
    <Box>
      <AnnouncementBanner />
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" sx={{ mb: 2 }}>Operations Dashboard</Typography>
          <Typography variant="body1" sx={{ mb: 4 }}>
            Welcome, {user.firstName}! You are logged in as {user.role}.
          </Typography>
          <Button variant="outlined" onClick={() => router.push('/products')} sx={{ mr: 2 }}>Browse Products</Button>
          <Button variant="outlined" onClick={() => router.push('/inventory')} sx={{ mr: 2 }}>Inventory</Button>
          <Button variant="outlined" onClick={handleLogout}>Logout</Button>
        </Box>
      </Box>
    </Box>
  );
}
