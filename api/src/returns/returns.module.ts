// Phase 8

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefundEntity } from './entities/refund.entity';
import { ReturnEvidenceEntity } from './entities/return-evidence.entity';
import { ReturnItemEntity } from './entities/return-item.entity';
import { ReturnEntity } from './entities/return.entity';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';
import { SupportReturnsController } from './support-returns.controller';

// Returns and refunds share one module - a refund only ever exists for a
// return, and creating one moves the return to REFUNDED in the same
// transaction. Orders and inventory are read/updated through the
// transaction manager, so their entities don't need registering here.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReturnEntity,
      ReturnItemEntity,
      ReturnEvidenceEntity,
      RefundEntity,
    ]),
  ],
  controllers: [ReturnsController, SupportReturnsController, RefundsController],
  providers: [ReturnsService, RefundsService],
})
export class ReturnsModule {}
