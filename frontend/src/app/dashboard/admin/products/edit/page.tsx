'use client';

// Phase 2

// WHAT THIS FILE IS:
// The "edit an existing product" page, admin-only. Combines two things: the
// same name/description/price/isActive form as the create page, and an
// image manager (upload new images, delete existing ones, mark one as
// primary) - since a product needs to exist before images can be attached
// to it.
//
// WHY THIS IS /dashboard/admin/products/edit?id=... AND NOT
// /dashboard/admin/products/[id]/edit:
// next.config.ts sets `output: 'export'` (a fully static build, needed for
// Amplify hosting). A static export has to know every possible URL at BUILD
// time - so a dynamic path segment like [id] would need every product id
// that will ever exist listed upfront via generateStaticParams(), which is
// impossible since products are created at runtime. Reading the id from a
// query string instead sidesteps that entirely: there's only ever one
// static page ("edit"), and which product it shows is resolved client-side
// after the page loads - same as everything else in this app already does.
//
// WHAT IT DOES:
// 1. Checks the user is logged in and is ADMIN.
// 2. Reads ?id=... from the URL (useSearchParams) and fetches that product.
// 3. Pre-fills the form; submitting calls updateProduct().
// 4. Image manager: shows current images as thumbnails with a "Primary"
//    badge on whichever one is primary, a Delete button per image, and a
//    file picker + "Upload" button (with an "as primary" checkbox) to add
//    a new one. Re-fetches the product after any image change so the grid
//    stays in sync with the backend.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/user';
import {
  getProduct,
  updateProduct,
  uploadProductImage,
  deleteProductImage,
} from '@/lib/api/products';
import { Product } from '@/types/product';

// useSearchParams() requires a Suspense boundary around whatever calls it -
// Next.js needs a fallback to show while the URL's query string is being
// read on first render. The default export below just provides that
// boundary; all the real logic lives in EditProductForm.
export default function EditProductPage() {
  return (
    <Suspense fallback={null}>
      <EditProductForm />
    </Suspense>
  );
}

function EditProductForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('id') ?? '';
  const { user, token, loading: authLoading } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePrimary, setNewImagePrimary] = useState(false);
  const [uploading, setUploading] = useState(false);

  function loadProduct(currentToken: string) {
    return getProduct(currentToken, productId).then((data) => {
      setProduct(data);
      setName(data.name);
      setDescription(data.description ?? '');
      setPrice(data.price);
      setIsActive(data.isActive);
    });
  }

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    if (user && user.role !== UserRole.ADMIN) { router.push('/dashboard/customer'); return; }
    if (!productId) { router.push('/dashboard/admin/products'); return; }

    loadProduct(token).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed to load product'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, authLoading, router, productId]);

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
      await updateProduct(token, productId, {
        name,
        description: description || undefined,
        price: parsedPrice,
        isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload() {
    if (!token || !newImageFile) return;
    setError('');
    setUploading(true);
    try {
      await uploadProductImage(token, productId, newImageFile, newImagePrimary);
      setNewImageFile(null);
      setNewImagePrimary(false);
      await loadProduct(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!token) return;
    if (!confirm('Delete this image?')) return;
    setError('');
    try {
      await deleteProductImage(token, productId, imageId);
      await loadProduct(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image');
    }
  }

  if (!user || user.role !== UserRole.ADMIN || !product) return null;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6, pb: 6 }}>
      <Box sx={{ width: 480 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Edit Product</Typography>
          <Button variant="outlined" size="small" onClick={() => router.push('/dashboard/admin/products')}>
            Back to List
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4 }}>
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
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>

        <Typography variant="h6" sx={{ mb: 2 }}>Images</Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          {product.images.length === 0 && (
            <Typography color="text.secondary" variant="body2">No images yet.</Typography>
          )}
          {product.images.map((image) => (
            <Box key={image.id} sx={{ width: 120 }}>
              <Box
                component="img"
                src={image.url}
                alt={product.name}
                sx={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 1, display: 'block' }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                {image.isPrimary ? (
                  <Chip label="Primary" size="small" color="primary" />
                ) : (
                  <span />
                )}
                <Button size="small" color="error" onClick={() => handleDeleteImage(image.id)}>
                  Delete
                </Button>
              </Box>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setNewImageFile(e.target.files?.[0] ?? null)}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={newImagePrimary}
                onChange={(e) => setNewImagePrimary(e.target.checked)}
              />
            }
            label="Set as primary image"
          />
          <Button
            variant="outlined"
            disabled={!newImageFile || uploading}
            onClick={handleUpload}
          >
            {uploading ? 'Uploading...' : 'Upload Image'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
