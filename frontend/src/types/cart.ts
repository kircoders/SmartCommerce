// Phase 4

// WHAT THIS FILE IS:
// Type definitions for carts and cart items, mirroring the backend's
// CartEntity and CartItemEntity (api/src/cart/entities/).
//
// NOTE ON CartItemProduct vs the full Product type (types/product.ts):
// A cart item's nested `product` comes from CartService's plain TypeORM
// relation load (relations: { items: { product: { images: true } } }) -
// NOT through ProductsService.attachStock(), so it does NOT have
// inStock/quantityAvailable/lowStockThreshold like the full Product type
// does. Reusing Product here would be a type lie - those three fields
// would say `boolean`/`number` in TypeScript but actually be `undefined`
// at runtime. CartItemProduct is the honest, narrower shape that's
// actually returned.

import { ProductImage } from './product';

export interface CartItemProduct {
  id: string;
  name: string;
  description: string | null;
  price: string;
  isActive: boolean;
  images: ProductImage[];
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  product: CartItemProduct;
  // unitPrice is a snapshot captured when the item was added - see
  // cart-item.entity.ts on the backend. Same numeric-as-string convention
  // as Product.price.
  quantity: number;
  unitPrice: string;
  createdAt: string;
  updatedAt: string;
}

// Status is now a real lookup table on the backend (cart_statuses) rather
// than a plain string column - the API returns statusId (a number: 1 =
// ACTIVE, 2 = CHECKED_OUT, 3 = ABANDONED), not a status string. Carts are
// also temporary now - deleted the moment an order is placed - so
// CHECKED_OUT/ABANDONED carts are rarely seen in practice at all.
export interface Cart {
  id: string;
  customerId: string;
  statusId: number;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

// Mirrors CartService.validateCheckout()'s return shape on the backend.
export interface CheckoutIssue {
  productId: string;
  requested: number;
  available: number;
}

export interface CheckoutValidation {
  valid: boolean;
  issues: CheckoutIssue[];
}
