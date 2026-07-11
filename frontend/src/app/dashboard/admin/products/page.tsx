'use client';

// Phase 2

// WHAT THIS FILE IS:
// The admin product management page at /dashboard/admin/products - the card
// grid from the sketch, but with Edit/Delete buttons on each card and an
// "Add Product" button. This is the ADMIN-only counterpart to the read-only
// /products browse page.
//
// WHAT IT DOES:
// 1. Checks if the user is logged in AND has the ADMIN role. Non-admins get
//    redirected to their own dashboard - the backend would reject their
//    write requests anyway (RolesGuard), but this avoids even showing them
//    a management screen they can't use.
// 2. Fetches all products and renders them as a card grid with Edit/Delete.
// 3. "Add Product" navigates to the create-product form.
// 4. Edit navigates to that product's edit page.
// 5. Delete asks for confirmation, then calls the delete endpoint and
//    removes the card from the grid on success.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';
import { getProducts, deleteProduct } from '@/lib/api/products';
import { Product } from '@/types/product';
import ProductCard from '@/components/products/ProductCard';

export default function AdminProductsPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && user.role !== UserRole.ADMIN) { router.push('/dashboard/customer'); return; }

    getProducts(token)
      .then(setProducts)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load products'))
      .finally(() => setLoading(false));
  }, [token, user, authLoading, router]);

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm('Delete this product? This also deletes its images.')) return;
    setError('');
    try {
      await deleteProduct(token, id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    }
  }

  if (!user || user.role !== UserRole.ADMIN) return null;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Products</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={() => router.push('/dashboard/admin')}>
            Back to Dashboard
          </Button>
          <Button variant="contained" onClick={() => router.push('/dashboard/admin/products/new')}>
            Add Product
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && products.length === 0 && (
        <Typography color="text.secondary">No products yet. Click "Add Product" to create one.</Typography>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onEdit={() => router.push(`/dashboard/admin/products/edit?id=${product.id}`)}
            onDelete={() => handleDelete(product.id)}
          />
        ))}
      </Box>
    </Box>
  );
}
