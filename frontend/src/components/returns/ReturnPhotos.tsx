'use client';

// Phase 8

// WHAT THIS FILE IS:
// The evidence photos on a return, shared by the customer's and the staff's
// Return Details pages. Each photo opens full size in a new tab. The links
// are signed and expire after ~15 minutes, so a photo that stops loading
// just needs the page refreshed.
//
// When onUpload is passed (the customer's page, while the return is still
// REQUESTED), an "Add photo" button is shown too.

import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CardMedia from '@mui/material/CardMedia';
import { ReturnEvidence } from '@/types/returns';

export const MAX_PHOTOS = 5;
export const PHOTO_TYPES = 'image/jpeg,image/png,image/webp';

interface ReturnPhotosProps {
  photos: ReturnEvidence[];
  onUpload?: (file: File) => Promise<void>;
}

export default function ReturnPhotos({ photos, onUpload }: ReturnPhotosProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUpload) return;
    setError('');
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  }

  const canAdd = onUpload && photos.length < MAX_PHOTOS;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      {photos.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 1 }}>No photos.</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          {photos.map((photo) => (
            <Box
              key={photo.id}
              component="a"
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ display: 'block', borderRadius: 1, overflow: 'hidden', border: 1, borderColor: 'divider' }}
            >
              <CardMedia component="img" image={photo.url} alt="Return photo" sx={{ width: 120, height: 120, objectFit: 'cover' }} />
            </Box>
          ))}
        </Box>
      )}
      {canAdd && (
        <>
          <input ref={inputRef} type="file" accept={PHOTO_TYPES} hidden onChange={handleFile} />
          <Button size="small" variant="outlined" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? 'Uploading...' : 'Add photo'}
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            JPEG, PNG, or WebP, up to 5 MB · {photos.length}/{MAX_PHOTOS}
          </Typography>
        </>
      )}
    </Box>
  );
}
