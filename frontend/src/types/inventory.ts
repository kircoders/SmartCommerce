// Phase 3

// WHAT THIS FILE IS:
// Type definitions for inventory records and adjustments, mirroring the
// backend's InventoryEntity and InventoryAdjustmentEntity
// (api/src/inventory/entities/).

import { Product } from './product';

export enum AdjustmentType {
  INCREASE = 'INCREASE',
  DECREASE = 'DECREASE',
  CORRECTION = 'CORRECTION',
}

export interface Inventory {
  id: string;
  productId: string;
  product: Product;
  quantityAvailable: number;
  quantityReserved: number;
  quantityTotal: number;
  lowStockThreshold: number;
  updatedAt: string;
}

export interface InventoryAdjustment {
  id: string;
  productId: string;
  adjustmentType: AdjustmentType;
  quantityChange: number;
  reason: string | null;
  adjustedBy: string;
  createdAt: string;
}
