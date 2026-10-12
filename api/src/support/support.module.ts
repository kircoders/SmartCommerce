// Phase 7

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../orders/entities/order.entity';
import { UserEntity } from '../users/entities/user.entity';
import { SupportTicketMessageEntity } from './entities/support-ticket-message.entity';
import { SupportTicketEntity } from './entities/support-ticket.entity';
import { SupportAgentController } from './support-agent.controller';
import { SupportCustomersController } from './support-customers.controller';
import { SupportStaffController } from './support-staff.controller';
import { SupportTicketsController } from './support-tickets.controller';
import { SupportTicketsService } from './support-tickets.service';

// UserEntity and OrderEntity are registered here too (not just the two
// ticket entities) - SupportTicketsService reads them directly (order
// ownership checks, customer search, customer lookup context), same
// reasoning as OrdersModule pulling in CartEntity/InventoryEntity.
@Module({
  imports: [
    TypeOrmModule.forFeature([SupportTicketEntity, SupportTicketMessageEntity, UserEntity, OrderEntity]),
  ],
  controllers: [
    SupportTicketsController,
    SupportAgentController,
    SupportCustomersController,
    SupportStaffController,
  ],
  providers: [SupportTicketsService],
})
export class SupportModule {}
