// Phase 2

// WHAT THIS FILE IS:
// The API client for all product-catalog requests to the backend - the
// frontend counterpart to api/src/products/. Same pattern as auth.ts/users.ts:
// plain functions, no UI, just fetch calls that pages/components call into.
//
// WHAT'S IN IT:
// - getProducts() / searchProducts() / getProduct(): public reads (any logged-in role)
// - createProduct() / updateProduct() / deleteProduct(): admin-only writes
// - uploadProductImage() / deleteProductImage(): admin-only image management
//
import { Product, ProductImage } from '@/types/product';
import { API_URL } from './config';

export interface ProductFormData {
  name: string;
  description?: string;
  price: number;
  isActive?: boolean;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function getProducts(token: string): Promise<Product[]> {
  const res = await fetch(`${API_URL}/products`, { headers: authHeaders(token) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to fetch products');
  return json.data;
}

export async function searchProducts(token: string, q: string): Promise<Product[]> {
  const res = await fetch(`${API_URL}/products/search?q=${encodeURIComponent(q)}`, {
    headers: authHeaders(token),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Search failed');
  return json.data;
}

export async function getProduct(token: string, id: string): Promise<Product> {
  const res = await fetch(`${API_URL}/products/${id}`, { headers: authHeaders(token) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to fetch product');
  return json.data;
}

export async function createProduct(token: string, data: ProductFormData): Promise<Product> {
  const res = await fetch(`${API_URL}/admin/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to create product');
  return json.data;
}

export async function updateProduct(
  token: string,
  id: string,
  data: Partial<ProductFormData>,
): Promise<Product> {
  const res = await fetch(`${API_URL}/admin/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to update product');
  return json.data;
}

export async function deleteProduct(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/products/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message ?? 'Failed to delete product');
  }
}

// file comes from an <input type="file"> - a browser File object, which
// FormData can carry directly as multipart/form-data (matches the backend's
// FileInterceptor('file') expectation).
export async function uploadProductImage(
  token: string,
  productId: string,
  file: File,
  isPrimary: boolean,
): Promise<ProductImage> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(
    `${API_URL}/admin/products/${productId}/images?primary=${isPrimary}`,
    {
      method: 'POST',
      // No Content-Type header here on purpose - the browser sets the
      // multipart boundary itself based on the FormData body. Setting it
      // manually breaks the upload.
      headers: authHeaders(token),
      body: formData,
    },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to upload image');
  return json.data;
}

export async function deleteProductImage(
  token: string,
  productId: string,
  imageId: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/admin/products/${productId}/images/${imageId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message ?? 'Failed to delete image');
  }
}
