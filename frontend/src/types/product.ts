// Phase 2

// WHAT THIS FILE IS:
// Type definitions for products and product images, mirroring the backend's
// ProductEntity and ProductImageEntity (api/src/products/entities/).
//
// WHY IT EXISTS:
// Same reasoning as types/user.ts - one shared shape that every page/component/
// API function dealing with products imports, instead of redefining it.
//
// NOTE ON `price`:
// Postgres NUMERIC columns come back from the backend as a string (not a
// number) to avoid floating-point rounding issues - so `price` is typed as
// `string` here to match what actually arrives over the wire. Convert with
// `Number(product.price)` wherever you need to do math or format it.

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  s3Key: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string;
  isActive: boolean;
  createdBy: string;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
  // Phase 3: derived from inventory (available > 0), attached server-side
  // by products.service.ts. Only present on the public read endpoints
  // (GET /products, /products/search, /products/:id) - never a raw
  // quantity, customers only ever see in-stock or not.
  inStock: boolean;
}
