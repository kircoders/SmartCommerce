// Phase 3

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductEntity } from '../../products/entities/product.entity';
import { UserEntity } from '../../users/entities/user.entity';

export enum AdjustmentType {
  INCREASE = 'INCREASE',
  DECREASE = 'DECREASE',
  CORRECTION = 'CORRECTION',
}

// Maps to the "inventory_adjustments" table - an append-only audit log.
// Unlike InventoryEntity (one row per product, overwritten as stock
// changes), this is ManyToOne: every stock change ever made creates a new
// row here, and existing rows are never edited or deleted.
@Entity('inventory_adjustments')
export class InventoryAdjustmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @Column({ name: 'adjustment_type', type: 'varchar', length: 20 })
  adjustmentType!: AdjustmentType;

  // Signed: positive for an increase, negative for a decrease/correction
  // downward.
  @Column({ name: 'quantity_change', type: 'integer' })
  quantityChange!: number;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  // Who made the change - like products.createdBy, this always comes from
  // the authenticated user server-side, never from client input.
  @Column({ name: 'adjusted_by', type: 'uuid' })
  adjustedBy!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'adjusted_by' })
  adjuster!: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
