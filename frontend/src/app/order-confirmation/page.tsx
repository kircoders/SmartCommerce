'use client';

// Phase 5

// WHAT THIS FILE IS:
// The order confirmation page at /order-confirmation?orderId=...&total=... -
// CUSTOMER only. Query params (not a dynamic [id] route) for the same
// static-export reason as the inventory/products edit pages - orderId and
// total are passed straight through from what placeOrder() already
// returned on the checkout page, so this page doesn't need to fetch
// anything itself.

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';

const DASHBOARD_ROUTES: Record<string, string> = {
  CUSTOMER: '/dashboard/customer',
  SUPPORT_AGENT: '/dashboard/support',
  WAREHOUSE_OPERATOR: '/dashboard/warehouse',
  OPERATIONS_MANAGER: '/dashboard/operations',
  ADMIN: '/dashboard/admin',
};

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={null}>
      <OrderConfirmation />
    </Suspense>
  );
}

function OrderConfirmation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const orderId = searchParams?.get('orderId') ?? '';
  const total = searchParams?.get('total') ?? '';

  if (authLoading) return null;
  if (!user) { router.push('/login'); return null; }
  if (user.role !== UserRole.CUSTOMER) { router.push(DASHBOARD_ROUTES[user.role]); return null; }

  return (
    <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', mt: 8 }}>
      <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
      <Typography variant="h4" sx={{ mb: 1 }}>Thank you for shopping!</Typography>
      <Typography color="text.secondary" sx={{ mb: 1 }}>
        Your order has been placed successfully.
      </Typography>
      {orderId && (
        <Typography variant="body2" color="text.secondary">
          Order ID: {orderId}
        </Typography>
      )}
      {total && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Total: ${Number(total).toFixed(2)}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button variant="outlined" size="large" onClick={() => router.push('/orders')}>
          View My Orders
        </Button>
        <Button variant="contained" size="large" onClick={() => router.push('/products')}>
          Back to Products
        </Button>
      </Box>
    </Box>
  );
}
