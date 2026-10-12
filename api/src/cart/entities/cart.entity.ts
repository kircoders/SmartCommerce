// Phase 4

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { CartItemEntity } from './cart-item.entity';
import { CartStatusEntity } from './cart-status.entity';

export enum CartStatus {
  ACTIVE = 'ACTIVE',
  CHECKED_OUT = 'CHECKED_OUT',
  ABANDONED = 'ABANDONED',
}

// Cart status now lives in a real lookup table (cart_statuses - see the
// migration and cart-status.entity.ts) instead of a plain text column.
// Application code still refers to statuses by name (CartStatus.ACTIVE,
// readable) - this map is the one place that translates a name into the
// actual numeric id the database stores.
export const CART_STATUS_IDS: Record<CartStatus, number> = {
  [CartStatus.ACTIVE]: 1,
  [CartStatus.CHECKED_OUT]: 2,
  [CartStatus.ABANDONED]: 3,
};

// Maps to the "carts" table. Every cart a customer has ever had lives here
// permanently (nothing gets deleted when a cart stops being current) -
// status is what distinguishes "the one that counts right now" from
// history. A partial unique index on (customer_id) WHERE status_id = 1
// (see the migration) enforces at most one ACTIVE cart per customer -
// TypeORM has no way to express that constraint itself, it's purely a
// database-level rule.
@Entity('carts')
export class CartEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'customer_id' })
  customer!: UserEntity;

  @Column({ name: 'status_id', type: 'integer' })
  statusId!: number;

  @ManyToOne(() => CartStatusEntity)
  @JoinColumn({ name: 'status_id' })
  cartStatus!: CartStatusEntity;

  // cascade: true here means saving a cart with new/changed items in this
  // array also saves those item rows - same pattern as
  // ProductEntity.images in Phase 2.
  @OneToMany(() => CartItemEntity, (item) => item.cart, { cascade: true })
  items!: CartItemEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
