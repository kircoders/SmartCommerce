// Phase 5

// WHAT THIS FILE IS:
// Type definitions for orders and order items, mirroring the backend's
// OrderEntity and OrderItemEntity (api/src/orders/entities/).
//
// Unlike CartItem, OrderItem has no nested `product` object - productName
// and unitPrice are frozen snapshots stored directly on the row (see
// order-item.entity.ts), specifically so an order stays accurate even if
// the real product is later renamed, re-priced, or deleted entirely.
// There's nothing to "join out to" the way cart items do.

export enum OrderStatus {
  PLACED = 'PLACED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: string;
  items?: OrderItem[];
  createdAt: string;
  updatedAt: string;
}
