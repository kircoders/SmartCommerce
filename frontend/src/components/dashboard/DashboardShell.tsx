'use client';

// Phase 10

// WHAT THIS FILE IS:
// The frame every role dashboard shares: the announcement banner, the
// title and welcome line, an error box, the page's own content (number
// cards and lists), and the row of quick-link buttons with Logout at the
// end. Each dashboard page only supplies what's different about it.

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import AnnouncementBanner from '@/components/ui/AnnouncementBanner';

export interface QuickLink {
  label: string;
  href: string;
}

interface DashboardShellProps {
  title: string;
  firstName: string;
  error: string;
  links: QuickLink[];
  onLogout: () => void;
  children: ReactNode;
}

export default function DashboardShell({ title, firstName, error, links, onLogout, children }: DashboardShellProps) {
  const router = useRouter();

  return (
    <Box>
      <AnnouncementBanner />
      <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
        <Typography variant="h4" sx={{ mb: 1 }}>{title}</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>Welcome back, {firstName}!</Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {children}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 4 }}>
          {links.map((link) => (
            <Button key={link.href} variant="outlined" onClick={() => router.push(link.href)}>
              {link.label}
            </Button>
          ))}
          <Button color="inherit" onClick={onLogout}>Logout</Button>
        </Box>
      </Box>
    </Box>
  );
}

// Two lists side by side on wide screens, stacked on phones.
export function TwoColumns({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
      {children}
    </Box>
  );
}
