'use client';

// Phase 2

// WHAT THIS FILE IS:
// The "create a new product" form at /dashboard/admin/products/new,
// admin-only. Mirrors the validation rules in CreateProductDto
// (api/src/products/dto/create-product.dto.ts) on the frontend, per
// docs/standards.md ("Form validation on the frontend mirrors backend DTO
// rules").
//
// WHAT IT DOES:
// 1. Checks the user is logged in and is ADMIN (same gate as the list page).
// 2. Collects name, description, price, isActive.
// 3. On submit, calls createProduct(), then redirects straight to that new
//    product's edit page - a product needs an id before you can attach
//    images to it, so image upload isn't available here on create.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';
import { createProduct } from '@/lib/api/products';

export default function NewProductPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && user.role !== UserRole.ADMIN) { router.push('/dashboard/customer'); return; }
  }, [token, user, authLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');

    const parsedPrice = Number(price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Price must be a non-negative number');
      return;
    }

    setSaving(true);
    try {
      const product = await createProduct(token, {
        name,
        description: description || undefined,
        price: parsedPrice,
        isActive,
      });
      router.push(`/dashboard/admin/products/edit?id=${product.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
      setSaving(false);
    }
  }

  if (!user || user.role !== UserRole.ADMIN) return null;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
      <Box sx={{ width: 400 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Add Product</Typography>
          <Button variant="outlined" size="small" onClick={() => router.push('/dashboard/admin/products')}>
            Cancel
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            margin="normal"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextField
            label="Price"
            type="number"
            slotProps={{ htmlInput: { step: '0.01', min: '0' } }}
            fullWidth
            margin="normal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <FormControlLabel
            control={<Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
            label="Active (visible in catalog)"
          />
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={saving}>
            {saving ? 'Creating...' : 'Create Product'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
