// Phase 11

// WHAT THIS FILE IS:
// The AI module: BedrockService (the connection to Amazon Bedrock), the
// customer assistant, the support-staff assistant, and the /api/ai endpoints.

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../orders/entities/order.entity';
import { ReturnEntity } from '../returns/entities/return.entity';
import { ShipmentEntity } from '../shipments/entities/shipment.entity';
import { SupportTicketEntity } from '../support/entities/support-ticket.entity';
import { UserEntity } from '../users/entities/user.entity';
import { AiController } from './ai.controller';
import { BedrockService } from './bedrock.service';
import { CustomerAssistantService } from './customer-assistant.service';
import { SupportAssistantService } from './support-assistant.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      OrderEntity,
      ShipmentEntity,
      ReturnEntity,
      SupportTicketEntity,
    ]),
  ],
  controllers: [AiController],
  providers: [
    BedrockService,
    CustomerAssistantService,
    SupportAssistantService,
  ],
  exports: [BedrockService],
})
export class AiModule {}
