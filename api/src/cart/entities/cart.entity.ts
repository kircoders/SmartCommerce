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

export enum CartStatus {
  ACTIVE = 'ACTIVE',
  CHECKED_OUT = 'CHECKED_OUT',
  ABANDONED = 'ABANDONED',
}

// Maps to the "carts" table. Every cart a customer has ever had lives here
// permanently (nothing gets deleted when a cart stops being current) -
// status is what distinguishes "the one that counts right now" from
// history. A partial unique index on (customer_id) WHERE status = 'ACTIVE'
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

  @Column({ type: 'varchar', length: 20, default: CartStatus.ACTIVE })
  status!: CartStatus;

  // cascade: true here means saving a cart with new/changed items in this
  // array also saves those item rows - same pattern as
  // ProductEntity.images in Phase 2.
  @OneToMany(() => CartItemEntity, (item) => item.cart, { cascade: true })
  items!: CartItemEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
