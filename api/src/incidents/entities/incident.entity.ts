// Phase 9

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderEntity } from '../../orders/entities/order.entity';
import { ShipmentEntity } from '../../shipments/entities/shipment.entity';
import { UserEntity } from '../../users/entities/user.entity';

export enum IncidentType {
  SHIPMENT_DELAY = 'SHIPMENT_DELAY',
  INVENTORY_ISSUE = 'INVENTORY_ISSUE',
  WAREHOUSE_ISSUE = 'WAREHOUSE_ISSUE',
  CUSTOMER_ESCALATION = 'CUSTOMER_ESCALATION',
  SYSTEM_ISSUE = 'SYSTEM_ISSUE',
  OTHER = 'OTHER',
}

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED. OPEN can go straight to
// RESOLVED, RESOLVED can be reopened (back to IN_PROGRESS), and CLOSED is
// final. See ALLOWED_TRANSITIONS in incidents.service.ts.
export enum IncidentStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

// Maps to "incidents" - one row per internal business problem. Never shown
// to customers; only operations managers and admins can see or touch it.
@Entity('incidents')
export class IncidentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Always the logged-in user, never client input.
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId!: string | null;

  @ManyToOne(() => OrderEntity, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity | null;

  @Column({ name: 'shipment_id', type: 'uuid', nullable: true })
  shipmentId!: string | null;

  @ManyToOne(() => ShipmentEntity, { nullable: true })
  @JoinColumn({ name: 'shipment_id' })
  shipment!: ShipmentEntity | null;

  @Column({ type: 'varchar', length: 30 })
  type!: IncidentType;

  @Column({ type: 'varchar', length: 20 })
  severity!: IncidentSeverity;

  @Column({ type: 'varchar', length: 20, default: IncidentStatus.OPEN })
  status!: IncidentStatus;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  // One editable notes field (what's been tried, who's been contacted...),
  // same idea as internal notes on returns.
  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  // Set when the incident moves to RESOLVED, cleared if it's reopened.
  // Stays set when it moves on to CLOSED.
  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
