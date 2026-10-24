// Phase 8

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderEntity } from '../../orders/entities/order.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { RefundEntity } from './refund.entity';
import { ReturnEvidenceEntity } from './return-evidence.entity';
import { ReturnItemEntity } from './return-item.entity';

// REQUESTED -> APPROVED -> RECEIVED -> REFUNDED, or REQUESTED -> REJECTED.
// REJECTED and REFUNDED are final. See ALLOWED_TRANSITIONS in
// returns.service.ts.
export enum ReturnStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RECEIVED = 'RECEIVED',
  REFUNDED = 'REFUNDED',
}

// Maps to "returns" - one row per return request. A customer can file more
// than one return against the same order (e.g. a second item breaks a week
// later); ReturnsService caps the total returned per order item at the
// quantity originally bought.
@Entity('returns')
export class ReturnEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => OrderEntity)
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'customer_id' })
  customer!: UserEntity;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'varchar', length: 20, default: ReturnStatus.REQUESTED })
  status!: ReturnStatus;

  // Staff-only. select: false (same idea as users.password_hash) so it can
  // never reach a customer by accident - only the support-side lookup asks
  // for it explicitly.
  @Column({
    name: 'internal_notes',
    type: 'text',
    nullable: true,
    select: false,
  })
  internalNotes!: string | null;

  @Column({ name: 'requested_at', type: 'timestamptz', default: () => 'NOW()' })
  requestedAt!: Date;

  // Whoever approved or rejected it - always the logged-in staff member,
  // never client input.
  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer!: UserEntity | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @OneToMany(() => ReturnItemEntity, (item) => item.returnRequest, {
    cascade: true,
  })
  items!: ReturnItemEntity[];

  @OneToMany(() => ReturnEvidenceEntity, (evidence) => evidence.returnRequest)
  evidence!: ReturnEvidenceEntity[];

  @OneToOne(() => RefundEntity, (refund) => refund.returnRequest)
  refund!: RefundEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
