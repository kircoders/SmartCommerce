// Phase 7

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
import { OrderEntity } from '../../orders/entities/order.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { SupportTicketMessageEntity } from './support-ticket-message.entity';

export enum TicketCategory {
  DELAYED_SHIPMENT = 'DELAYED_SHIPMENT',
  WRONG_ITEM = 'WRONG_ITEM',
  DAMAGED_ITEM = 'DAMAGED_ITEM',
  MISSING_PACKAGE = 'MISSING_PACKAGE',
  OTHER = 'OTHER',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_CUSTOMER = 'WAITING_FOR_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

// Maps to "support_tickets" - one row per customer complaint. order_id and
// assigned_agent_id are both optional: a ticket isn't necessarily about a
// specific order (see TicketCategory.OTHER), and every ticket starts
// unassigned until a support agent picks it up.
@Entity('support_tickets')
export class SupportTicketEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'customer_id' })
  customer!: UserEntity;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId!: string | null;

  @ManyToOne(() => OrderEntity, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity | null;

  @Column({ name: 'assigned_agent_id', type: 'uuid', nullable: true })
  assignedAgentId!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'assigned_agent_id' })
  assignedAgent!: UserEntity | null;

  @Column({ type: 'varchar', length: 30 })
  category!: TicketCategory;

  @Column({ type: 'varchar', length: 200 })
  subject!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 10, default: TicketPriority.MEDIUM })
  priority!: TicketPriority;

  @Column({ type: 'varchar', length: 25, default: TicketStatus.OPEN })
  status!: TicketStatus;

  @OneToMany(() => SupportTicketMessageEntity, (message) => message.ticket)
  messages!: SupportTicketMessageEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;
}
