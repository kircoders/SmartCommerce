// Phase 8

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderItemEntity } from '../../orders/entities/order-item.entity';
import { ReturnEntity } from './return.entity';

// Maps to "return_items" - one row per order item being sent back. Points
// at the order item (not the product) because that's where the price the
// customer actually paid is frozen, which is what the refund is based on.
@Entity('return_items')
export class ReturnItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'return_id', type: 'uuid' })
  returnId!: string;

  // "returnRequest" rather than "return" - return is a reserved word.
  @ManyToOne(() => ReturnEntity, (returnRequest) => returnRequest.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'return_id' })
  returnRequest!: ReturnEntity;

  @Column({ name: 'order_item_id', type: 'uuid' })
  orderItemId!: string;

  @ManyToOne(() => OrderItemEntity)
  @JoinColumn({ name: 'order_item_id' })
  orderItem!: OrderItemEntity;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ name: 'condition_notes', type: 'text', nullable: true })
  conditionNotes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
