'use client';

// WHAT THIS FILE IS:
// The Login page — what the user sees at http://localhost:3001/login.
// This is a Client Component (notice 'use client' at the top) because it
// needs interactivity: state, form handling, and navigation after login.
//
// WHAT IT DOES:
// 1. Renders a centered form with Email and Password fields
// 2. When submitted, calls login() from lib/api/auth.ts to hit the backend
// 3. If login succeeds: saves the token via useAuth(), then redirects the
//    user to their role-specific dashboard (e.g. /dashboard/customer)
// 4. If login fails: shows a red error Alert with the backend's error message
//
// MUI COMPONENTS USED:
// - Box: layout container (like a div)
// - Typography: the "SmartCommerce Login" heading
// - TextField: the email and password input fields
// - Button: the submit button
// - Alert: the red error message box

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Link from 'next/link';
import { login } from '@/lib/api/auth';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { saveAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login({ email, password });
      saveAuth(data.accessToken, data.user);
      router.push(data.redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Box component="form" onSubmit={handleSubmit} sx={{ width: 360 }}>
        <Typography variant="h5" sx={{ mb: 3 }}>SmartCommerce Login</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField label="Email" type="email" fullWidth margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <TextField label="Password" type="password" fullWidth margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </Button>

        <Typography sx={{ mt: 2 }} variant="body2">
          Don&apos;t have an account? <Link href="/register">Register</Link>
        </Typography>
      </Box>
    </Box>
  );
}
