// Phase 8

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderEntity } from '../../orders/entities/order.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { ReturnEntity } from './return.entity';

// No payment gateway yet, so a refund is created already COMPLETED - it's a
// record that the money was given back. PENDING is the column default for
// when a real gateway (which confirms asynchronously) gets added.
export enum RefundStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

// Maps to "refunds" - at most one per return (return_id is UNIQUE in the
// migration). order_id is technically derivable through the return, but is
// stored directly so refunds can be looked up per order without a join.
@Entity('refunds')
export class RefundEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'return_id', type: 'uuid' })
  returnId!: string;

  @OneToOne(() => ReturnEntity, (returnRequest) => returnRequest.refund)
  @JoinColumn({ name: 'return_id' })
  returnRequest!: ReturnEntity;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => OrderEntity)
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 20, default: RefundStatus.PENDING })
  status!: RefundStatus;

  @Column({ name: 'processed_by', type: 'uuid', nullable: true })
  processedBy!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'processed_by' })
  processor!: UserEntity | null;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
