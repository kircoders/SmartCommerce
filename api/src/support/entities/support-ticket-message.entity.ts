// Phase 7

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { SupportTicketEntity } from './support-ticket.entity';

// Maps to "support_ticket_messages" - the conversation thread on a ticket.
// The customer's original complaint is NOT stored here - it's the ticket's
// own `description` field. This table is only for what gets added AFTER
// that: every reply, from either the customer or the assigned agent,
// stored the same way regardless of who sent it (sender_id says who).
@Entity('support_ticket_messages')
export class SupportTicketMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId!: string;

  @ManyToOne(() => SupportTicketEntity, (ticket) => ticket.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: SupportTicketEntity;

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'sender_id' })
  sender!: UserEntity;

  @Column({ type: 'text' })
  message!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
