// Phase 5

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
import { OrderItemEntity } from './order-item.entity';

export enum OrderStatus {
  PLACED = 'PLACED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

// Maps to the "orders" table - a permanent record of a completed purchase.
// Unlike a cart (mutable, temporary), an order should never silently
// change after it's placed - totalAmount is frozen at checkout time, same
// reasoning as OrderItemEntity's unitPrice/productName snapshots.
@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'customer_id' })
  customer!: UserEntity;

  // No cartId here - carts (and cart_items) are temporary, deleted the
  // moment an order is placed (see OrdersService.placeOrder()), so a
  // reference to the originating cart would always point at something
  // already gone. order_items is the permanent record of what was
  // actually bought; the cart was only ever a stepping stone to get here.
  @Column({ type: 'varchar', length: 20, default: OrderStatus.PLACED })
  status!: OrderStatus;

  @Column({ name: 'total_amount', type: 'numeric', precision: 10, scale: 2 })
  totalAmount!: number;

  @OneToMany(() => OrderItemEntity, (item) => item.order, { cascade: true })
  items!: OrderItemEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
