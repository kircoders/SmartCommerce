// Phase 8

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateRefundDto } from './dto/create-refund.dto';
import { RefundEntity, RefundStatus } from './entities/refund.entity';
import { ReturnItemEntity } from './entities/return-item.entity';
import { ReturnEntity, ReturnStatus } from './entities/return.entity';

// No payment gateway - "processing" a refund means recording it. The refund
// row and the return moving to REFUNDED happen in one transaction, so a
// return can never say REFUNDED without a refund record behind it.
@Injectable()
export class RefundsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(RefundEntity)
    private readonly refundRepo: Repository<RefundEntity>,
  ) {}

  async createRefund(
    staffId: string,
    dto: CreateRefundDto,
  ): Promise<RefundEntity> {
    const refundId = await this.dataSource.transaction(async (manager) => {
      // Locked so two clicks on "Refund" can't create two refunds.
      const returnRequest = await manager.findOne(ReturnEntity, {
        where: { id: dto.returnId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!returnRequest) throw new NotFoundException('Return not found');
      if (returnRequest.status === ReturnStatus.REFUNDED) {
        throw new BadRequestException('This return has already been refunded');
      }
      if (returnRequest.status !== ReturnStatus.RECEIVED) {
        throw new BadRequestException(
          'Only returns that have been received can be refunded',
        );
      }

      // Price actually paid (frozen on the order item) x quantity returned.
      // Worked in cents so the total doesn't pick up floating-point dust.
      const items = await manager.find(ReturnItemEntity, {
        where: { returnId: returnRequest.id },
        relations: { orderItem: true },
      });
      const cents = items.reduce(
        (sum, item) =>
          sum +
          Math.round(Number(item.orderItem.unitPrice) * 100) * item.quantity,
        0,
      );

      const refund = await manager.save(
        manager.create(RefundEntity, {
          returnId: returnRequest.id,
          orderId: returnRequest.orderId,
          amount: cents / 100,
          status: RefundStatus.COMPLETED,
          processedBy: staffId,
          processedAt: new Date(),
        }),
      );
      await manager.update(ReturnEntity, returnRequest.id, {
        status: ReturnStatus.REFUNDED,
      });
      return refund.id;
    });

    return this.findOne(refundId);
  }

  async findOne(refundId: string): Promise<RefundEntity> {
    const refund = await this.refundRepo.findOne({
      where: { id: refundId },
      relations: { returnRequest: true, order: true, processor: true },
    });
    if (!refund) throw new NotFoundException('Refund not found');
    return refund;
  }
}
