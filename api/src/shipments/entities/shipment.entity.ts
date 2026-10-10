// Phase 6

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderEntity } from '../../orders/entities/order.entity';

export enum ShipmentStatus {
  CREATED = 'CREATED',
  PACKED = 'PACKED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
}

// Maps to the "shipments" table - one row per order (OneToOne, matching
// the UNIQUE(order_id) constraint from the migration), tracking that
// order's fulfillment progress. Unlike orders/order_items, this is
// intended to be MUTATED over time (status/dates update as a warehouse
// operator actually packs and ships it) - not a frozen snapshot.
@Entity('shipments')
export class ShipmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid', unique: true })
  orderId!: string;

  @OneToOne(() => OrderEntity)
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @Column({ type: 'varchar', length: 20, default: ShipmentStatus.CREATED })
  status!: ShipmentStatus;

  @Column({ name: 'tracking_number', type: 'varchar', length: 100, nullable: true })
  trackingNumber!: string | null;

  @Column({ name: 'shipped_date', type: 'timestamp', nullable: true })
  shippedDate!: Date | null;

  @Column({ name: 'delivered_date', type: 'timestamp', nullable: true })
  deliveredDate!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
