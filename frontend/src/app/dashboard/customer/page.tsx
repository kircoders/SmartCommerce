'use client';

// WHAT THIS FILE IS:
// The Customer Dashboard — what a CUSTOMER role user sees after logging in.
// This is a placeholder page for Phase 1. In a later phase, this will show
// things like order history, cart, etc. For now it just confirms the user
// is logged in and shows their name and role.
//
// WHAT IT DOES:
// 1. Checks if the user is logged in. If not, redirects to /login.
// 2. Displays a welcome message with the user's first name and role
// 3. Provides a button to go to the Profile page
// 4. Provides a Logout button that clears the token and redirects to /login

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/lib/api/auth';
import AnnouncementBanner from '@/components/ui/AnnouncementBanner';

export default function CustomerDashboard() {
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
        <Typography variant="h4" sx={{ mb: 2 }}>Customer Dashboard</Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          Welcome, {user.firstName}! You are logged in as {user.role}.
        </Typography>
        <Button variant="outlined" onClick={() => router.push('/profile')} sx={{ mr: 2 }}>My Profile</Button>
        <Button variant="outlined" onClick={handleLogout}>Logout</Button>
      </Box>
      </Box>
    </Box>
  );
}
