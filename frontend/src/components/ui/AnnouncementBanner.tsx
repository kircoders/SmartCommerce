'use client';

// Phase 1


import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import { getAnnouncement } from '@/lib/api/announcements';

export default function AnnouncementBanner() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    getAnnouncement().then(setMessage);
  }, []);

  if (!message) return null;

  return (
    <Alert severity="info" sx={{ borderRadius: 0, mb: 0 }}>
      {message}
    </Alert>
  );
}
