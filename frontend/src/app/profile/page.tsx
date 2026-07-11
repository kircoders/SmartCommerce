'use client';

// Phase 1


// WHAT THIS FILE IS:
// The Profile page — what the user sees at http://localhost:3001/profile.
// This is a protected page: if you're not logged in, you get redirected to /login.
//
// WHAT IT DOES:
// 1. On load: checks if the user is logged in (via useAuth). If not, redirects to /login.
// 2. Fetches the current user's profile from the backend using getProfile()
// 3. Pre-fills a form with the user's current first name, last name, and email
// 4. When the form is submitted, calls updateProfile() to save changes to the backend
// 5. Shows a green success Alert or red error Alert depending on the result
// 6. Has a Logout button that clears the token and redirects to /login
//
// WHAT USERS CAN CHANGE: first name, last name, email
// WHAT USERS CANNOT CHANGE: role, account status, password (not implemented here)
//
// MUI COMPONENTS USED:
// - Box: layout and form container
// - Typography: heading and role display
// - TextField: the three editable fields
// - Button: Save Changes and Logout buttons
// - Alert: success (green) and error (red) message boxes

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useAuth } from '@/hooks/useAuth';
import { getProfile, updateProfile } from '@/lib/api/users';
import { logout } from '@/lib/api/auth';
import { User } from '@/types/user';

export default function ProfilePage() {
  const router = useRouter();
  const { token, clearAuth, saveAuth, loading: authLoading } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }

    getProfile(token).then((data) => {
      setUser(data);
      setFirstName(data.firstName);
      setLastName(data.lastName);
      setEmail(data.email);
    }).catch(() => {
      clearAuth();
      router.push('/login');
    });
  }, [token, authLoading, router, clearAuth]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const updated = await updateProfile(token, { firstName, lastName, email });
      setUser(updated);
      saveAuth(token, updated);
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  }

  const dashboardRoutes: Record<string, string> = {
    CUSTOMER: '/dashboard/customer',
    SUPPORT_AGENT: '/dashboard/support',
    WAREHOUSE_OPERATOR: '/dashboard/warehouse',
    OPERATIONS_MANAGER: '/dashboard/operations',
    ADMIN: '/dashboard/admin',
  };

  async function handleLogout() {
    if (token) await logout(token);
    clearAuth();
    router.push('/login');
  }

  if (!user) return null;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Box sx={{ width: 360 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">My Profile</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small" onClick={() => router.push(dashboardRoutes[user.role])}>Back to Dashboard</Button>
            <Button variant="outlined" size="small" onClick={handleLogout}>Logout</Button>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Role: {user.role}</Typography>

        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleUpdate}>
          <TextField label="First Name" fullWidth margin="normal" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <TextField label="Last Name" fullWidth margin="normal" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          <TextField label="Email" type="email" fullWidth margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
