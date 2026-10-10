// Phase 5

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductEntity } from '../../products/entities/product.entity';
import { OrderEntity } from './order.entity';

// Maps to the "order_items" table - one row per distinct product within an
// order. productName and unitPrice are both frozen at the moment the order
// is placed (see the migration) - a permanent order record needs to stay
// accurate even if the real product is later renamed, re-priced, or
// deleted entirely, which is exactly why productId has no onDelete
// behavior here either.
@Entity('order_items')
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  // onDelete: 'CASCADE' - deleting an order automatically deletes its
  // items at the database level (matches ON DELETE CASCADE in the
  // migration). Same pattern as CartItemEntity/CartEntity.
  @ManyToOne(() => OrderEntity, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @Column({ name: 'product_name', length: 255 })
  productName!: string;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 10, scale: 2 })
  unitPrice!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
