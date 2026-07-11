'use client';

// Phase 2

// WHAT THIS FILE IS:
// The public product catalog - what any logged-in user (any role) sees at
// /products. View-only: no edit/delete buttons, since those live on the
// admin-only /dashboard/admin/products page instead.
//
// WHAT IT DOES:
// 1. Checks if the user is logged in. If not, redirects to /login.
// 2. Fetches all active products on load and renders them as a card grid.
// 3. A search box calls the search endpoint and replaces the grid with
//    matching results; clearing the box goes back to the full list.
// 4. Clicking a card opens ProductDetailDialog (a popup) showing that
//    product's full details - "Buy" (dead end for now) / "Close".

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import { useAuth } from '@/hooks/useAuth';
import { getProducts, searchProducts } from '@/lib/api/products';
import { Product } from '@/types/product';
import ProductCard from '@/components/products/ProductCard';
import ProductDetailDialog from '@/components/products/ProductDetailDialog';

export default function ProductsPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }

    getProducts(token)
      .then(setProducts)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load products'))
      .finally(() => setLoading(false));
  }, [token, authLoading, router]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');
    setLoading(true);
    try {
      const results = query.trim() ? await searchProducts(token, query) : await getProducts(token);
      setProducts(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  const dashboardRoutes: Record<string, string> = {
    CUSTOMER: '/dashboard/customer',
    SUPPORT_AGENT: '/dashboard/support',
    WAREHOUSE_OPERATOR: '/dashboard/warehouse',
    OPERATIONS_MANAGER: '/dashboard/operations',
    ADMIN: '/dashboard/admin',
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Products</Typography>
        <Button variant="outlined" onClick={() => router.push(dashboardRoutes[user.role])}>
          Back to Dashboard
        </Button>
      </Box>

      <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ width: 300 }}
        />
        <Button type="submit" variant="contained">Search</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && products.length === 0 && (
        <Typography color="text.secondary">No products found.</Typography>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={() => setSelectedProduct(product)}
          />
        ))}
      </Box>

      <ProductDetailDialog product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </Box>
  );
}
