'use client';

// Phase 3

// WHAT THIS FILE IS:
// The inventory list at /inventory - WAREHOUSE_OPERATOR, OPERATIONS_MANAGER,
// and ADMIN only (no view-only tier for anyone else, unlike /products).
//
// WHAT IT DOES:
// 1. Checks the user is logged in AND has one of the three allowed roles -
//    redirects everyone else to their own dashboard.
// 2. Fetches all inventory records and renders them as a table: product
//    name, available/reserved/total quantities, a computed low-stock
//    status chip, and last-updated time.
// 3. Clicking a row navigates to the detail/adjustment page for that
//    product.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';
import { getInventory } from '@/lib/api/inventory';
import { Inventory } from '@/types/inventory';

const ALLOWED_ROLES = [UserRole.WAREHOUSE_OPERATOR, UserRole.OPERATIONS_MANAGER, UserRole.ADMIN];

const DASHBOARD_ROUTES: Record<string, string> = {
  CUSTOMER: '/dashboard/customer',
  SUPPORT_AGENT: '/dashboard/support',
  WAREHOUSE_OPERATOR: '/dashboard/warehouse',
  OPERATIONS_MANAGER: '/dashboard/operations',
  ADMIN: '/dashboard/admin',
};

export default function InventoryPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && !ALLOWED_ROLES.includes(user.role)) {
      router.push(DASHBOARD_ROUTES[user.role]);
      return;
    }

    getInventory(token)
      .then(setInventory)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load inventory'))
      .finally(() => setLoading(false));
  }, [token, user, authLoading, router]);

  if (!user || !ALLOWED_ROLES.includes(user.role)) return null;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Inventory</Typography>
        <Button variant="outlined" onClick={() => router.push(DASHBOARD_ROUTES[user.role])}>
          Back to Dashboard
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && inventory.length === 0 && (
        <Typography color="text.secondary">No inventory records yet.</Typography>
      )}

      {inventory.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell align="right">Available</TableCell>
                <TableCell align="right">Reserved</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventory.map((record) => {
                const isOutOfStock = record.quantityAvailable === 0;
                const isLowStock = !isOutOfStock && record.quantityAvailable <= record.lowStockThreshold;
                return (
                  <TableRow
                    key={record.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/inventory/edit?id=${record.productId}`)}
                  >
                    <TableCell>{record.product.name}</TableCell>
                    <TableCell align="right">{record.quantityAvailable}</TableCell>
                    <TableCell align="right">{record.quantityReserved}</TableCell>
                    <TableCell align="right">{record.quantityTotal}</TableCell>
                    <TableCell>
                      {isOutOfStock ? (
                        <Chip label="OUT OF STOCK" color="error" size="small" />
                      ) : isLowStock ? (
                        <Chip
                          label={`Get it now, only ${record.quantityAvailable} left!`}
                          color="warning"
                          size="small"
                        />
                      ) : (
                        <Chip label="IN STOCK" color="success" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>{new Date(record.updatedAt).toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
