// Phase 12

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PRODUCT_CREATED = 'PRODUCT_CREATED',
  PRODUCT_UPDATED = 'PRODUCT_UPDATED',
  PRODUCT_DELETED = 'PRODUCT_DELETED',
  INVENTORY_ADJUSTED = 'INVENTORY_ADJUSTED',
  ORDER_PLACED = 'ORDER_PLACED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  SHIPMENT_STATUS_UPDATED = 'SHIPMENT_STATUS_UPDATED',
  SHIPMENT_TRACKING_UPDATED = 'SHIPMENT_TRACKING_UPDATED',
  TICKET_CREATED = 'TICKET_CREATED',
  RETURN_REQUESTED = 'RETURN_REQUESTED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  INCIDENT_CREATED = 'INCIDENT_CREATED',
  INCIDENT_RESOLVED = 'INCIDENT_RESOLVED',
}

// Which kind of record entity_id points at.
export enum AuditEntityType {
  USER = 'USER',
  PRODUCT = 'PRODUCT',
  ORDER = 'ORDER',
  SHIPMENT = 'SHIPMENT',
  SUPPORT_TICKET = 'SUPPORT_TICKET',
  RETURN = 'RETURN',
  REFUND = 'REFUND',
  INCIDENT = 'INCIDENT',
}

// Maps to "audit_logs" - one row per important action. Written only by
// AuditInterceptor; nothing updates or deletes these rows.
@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Who did it.
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 50 })
  action!: AuditAction;

  @Column({ name: 'entity_type', type: 'varchar', length: 30 })
  entityType!: AuditEntityType;

  // The record it was done to (a product, an order...). Not a foreign key,
  // since it can point at any of several tables.
  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId!: string | null;

  @Column({ type: 'text' })
  description!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
