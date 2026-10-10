// Phase 6

// WHAT THIS FILE IS:
// Type definitions for shipments, mirroring the backend's ShipmentEntity
// (api/src/shipments/entities/shipment.entity.ts). One shipment per order -
// created automatically the moment an order is placed, then mutated over
// time by a warehouse operator (status, tracking number, dates), unlike
// Order/OrderItem which are frozen snapshots.

export enum ShipmentStatus {
  CREATED = 'CREATED',
  PACKED = 'PACKED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
}

export interface Shipment {
  id: string;
  orderId: string;
  status: ShipmentStatus;
  trackingNumber: string | null;
  shippedDate: string | null;
  deliveredDate: string | null;
  createdAt: string;
  updatedAt: string;
}
