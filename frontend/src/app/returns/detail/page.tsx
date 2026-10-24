'use client';

// Phase 8

// WHAT THIS FILE IS:
// The customer's Return Details page at /returns/detail?id=... - CUSTOMER
// only. Status (with what happens next), the related order, the items and
// what they're worth, the reason, photos (more can be added while it's
// still REQUESTED), and the refund once issued. Staff-only internal notes
// never reach this page - the backend doesn't send them to customers.
// ?created=1 shows a confirmation after submitting; ?photoErrors=N warns
// that some photos didn't upload.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';
import { getMyReturn, uploadReturnPhoto } from '@/lib/api/returns';
import { DASHBOARD_ROUTES } from '@/lib/dashboard-routes';
import ReturnItemsTable from '@/components/returns/ReturnItemsTable';
import ReturnPhotos from '@/components/returns/ReturnPhotos';
import {
  RETURN_STATUS_COLORS,
  RETURN_STATUS_HELP,
  RETURN_STATUS_LABELS,
  ReturnRequest,
  ReturnStatus,
} from '@/types/returns';

// useSearchParams() requires a Suspense boundary - same reasoning as the
// shipment detail page.
export default function ReturnDetailPage() {
  return (
    <Suspense fallback={null}>
      <ReturnDetail />
    </Suspense>
  );
}

function ReturnDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnId = searchParams?.get('id') ?? '';
  const justCreated = searchParams?.get('created') === '1';
  const photoErrors = Number(searchParams?.get('photoErrors') ?? 0);
  const { user, token, loading: authLoading } = useAuth();

  const [ret, setRet] = useState<ReturnRequest | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && user.role !== UserRole.CUSTOMER) { router.push(DASHBOARD_ROUTES[user.role]); return; }
    if (!returnId) { router.push('/returns'); return; }

    getMyReturn(token, returnId)
      .then(setRet)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load return'));
  }, [token, user, authLoading, router, returnId]);

  async function handleUpload(file: File) {
    if (!token) return;
    await uploadReturnPhoto(token, returnId, file);
    setRet(await getMyReturn(token, returnId));
  }

  if (!user || user.role !== UserRole.CUSTOMER) return null;

  if (!ret) {
    return error ? (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="outlined" onClick={() => router.push('/returns')}>Back to My Returns</Button>
      </Box>
    ) : (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h5">Return for order #{ret.orderId.slice(0, 8)}</Typography>
        <Button variant="outlined" size="small" onClick={() => router.push('/returns')}>
          Back to My Returns
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 3 }}>
        <Chip label={RETURN_STATUS_LABELS[ret.status]} size="small" color={RETURN_STATUS_COLORS[ret.status]} />
        <Typography variant="body2" color="text.secondary">
          Requested {new Date(ret.requestedAt).toLocaleString()}
          {ret.reviewedAt && ` · Reviewed ${new Date(ret.reviewedAt).toLocaleString()}`}
        </Typography>
      </Box>

      {justCreated && <Alert severity="success" sx={{ mb: 2 }}>Your return request was submitted.</Alert>}
      {photoErrors > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {photoErrors} photo{photoErrors === 1 ? '' : 's'} couldn&apos;t be uploaded. You can add them again below.
        </Alert>
      )}
      <Alert severity={ret.status === ReturnStatus.REJECTED ? 'error' : 'info'} sx={{ mb: 3 }}>
        {RETURN_STATUS_HELP[ret.status]}
      </Alert>

      {ret.refund && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1">Refund</Typography>
          <Typography variant="h5">${Number(ret.refund.amount).toFixed(2)}</Typography>
          <Typography variant="body2" color="text.secondary">
            {ret.refund.status === 'COMPLETED' ? 'Issued' : 'Pending'}
            {ret.refund.processedAt && ` on ${new Date(ret.refund.processedAt).toLocaleDateString()}`}
          </Typography>
        </Paper>
      )}

      <Typography variant="h6" sx={{ mb: 1 }}>Items</Typography>
      <ReturnItemsTable items={ret.items ?? []} />

      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Reason</Typography>
      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{ret.reason}</Typography>

      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Photos</Typography>
      <ReturnPhotos
        photos={ret.evidence ?? []}
        onUpload={ret.status === ReturnStatus.REQUESTED ? handleUpload : undefined}
      />
    </Box>
  );
}
