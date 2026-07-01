'use client';

// WHAT THIS FILE IS:
// The Register page — what the user sees at http://localhost:3001/register.
// Only customers can self-register. Other roles (admin, support, etc.)
// must be created manually in the database by an admin.
//
// WHAT IT DOES:
// 1. Renders a centered form with First Name, Last Name, Email, and Password fields
// 2. When submitted, calls register() from lib/api/auth.ts to hit the backend
// 3. If registration succeeds: redirects to /login so the user can log in
// 4. If registration fails (e.g. duplicate email): shows a red error Alert
//
// MUI COMPONENTS USED:
// - Box: layout container
// - Typography: the "Create Account" heading
// - TextField: all four input fields
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
import { register } from '@/lib/api/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ firstName, lastName, email, password });
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Box component="form" onSubmit={handleSubmit} sx={{ width: 360 }}>
        <Typography variant="h5" sx={{ mb: 3 }}>Create Account</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField label="First Name" fullWidth margin="normal" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <TextField label="Last Name" fullWidth margin="normal" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        <TextField label="Email" type="email" fullWidth margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <TextField label="Password" type="password" fullWidth margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </Button>

        <Typography sx={{ mt: 2 }} variant="body2">
          Already have an account? <Link href="/login">Login</Link>
        </Typography>
      </Box>
    </Box>
  );
}
