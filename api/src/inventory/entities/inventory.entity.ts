// Phase 3

import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductEntity } from '../../products/entities/product.entity';

// Maps to the "inventory" table. One row per product - product_id is UNIQUE
// at the database level (see the migration), so this is a OneToOne relation,
// unlike ProductEntity's OneToMany to images.
@Entity('inventory')
export class InventoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @OneToOne(() => ProductEntity)
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @Column({ name: 'quantity_available', type: 'integer', default: 0 })
  quantityAvailable!: number;

  @Column({ name: 'quantity_reserved', type: 'integer', default: 0 })
  quantityReserved!: number;

  @Column({ name: 'quantity_total', type: 'integer', default: 0 })
  quantityTotal!: number;

  // Below this, GET /api/inventory/low-stock includes the product.
  @Column({ name: 'low_stock_threshold', type: 'integer', default: 0 })
  lowStockThreshold!: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
