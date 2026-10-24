// Phase 8

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import {
  AdjustmentType,
  InventoryAdjustmentEntity,
} from '../inventory/entities/inventory-adjustment.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { OrderEntity, OrderStatus } from '../orders/entities/order.entity';
import { BUCKET, REGION } from '../products/products.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { UpdateReturnStatusDto } from './dto/update-return-status.dto';
import { ReturnEvidenceEntity } from './entities/return-evidence.entity';
import { ReturnItemEntity } from './entities/return-item.entity';
import { ReturnEntity, ReturnStatus } from './entities/return.entity';

// Where each status can go next. RECEIVED -> REFUNDED isn't listed: that
// only happens through RefundsService.createRefund(), never a plain status
// change.
const ALLOWED_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  [ReturnStatus.REQUESTED]: [ReturnStatus.APPROVED, ReturnStatus.REJECTED],
  [ReturnStatus.APPROVED]: [ReturnStatus.RECEIVED],
  [ReturnStatus.RECEIVED]: [],
  [ReturnStatus.REJECTED]: [],
  [ReturnStatus.REFUNDED]: [],
};

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_EVIDENCE_PER_RETURN = 5;
const SIGNED_URL_SECONDS = 15 * 60;

const CUSTOMER_DETAIL_RELATIONS = {
  order: true,
  items: { orderItem: true },
  evidence: true,
  refund: true,
} as const;

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);
  private readonly s3 = new S3Client({ region: REGION });

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(ReturnEntity)
    private readonly returnRepo: Repository<ReturnEntity>,
    @InjectRepository(ReturnEvidenceEntity)
    private readonly evidenceRepo: Repository<ReturnEvidenceEntity>,
  ) {}

  // ---- Customer-facing ----

  async createReturn(
    customerId: string,
    dto: CreateReturnDto,
  ): Promise<ReturnEntity> {
    const orderItemIds = dto.items.map((item) => item.orderItemId);
    if (new Set(orderItemIds).size !== orderItemIds.length) {
      throw new BadRequestException('Each item can only be listed once');
    }

    const returnId = await this.dataSource.transaction(async (manager) => {
      // Locking the order row means two return requests for the same order
      // are checked one after the other - otherwise both could see "1 mug
      // still returnable" and both return it.
      const order = await manager.findOne(OrderEntity, {
        where: { id: dto.orderId, customerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new BadRequestException('Order not found');
      if (order.status !== OrderStatus.DELIVERED) {
        throw new BadRequestException('Only delivered orders can be returned');
      }

      const orderItems = await manager.find(OrderItemEntity, {
        where: { orderId: order.id },
      });
      const alreadyReturned = await this.returnedQuantities(manager, order.id);

      for (const item of dto.items) {
        const orderItem = orderItems.find((oi) => oi.id === item.orderItemId);
        if (!orderItem)
          throw new BadRequestException('Item is not part of this order');

        const remaining =
          orderItem.quantity - (alreadyReturned.get(orderItem.id) ?? 0);
        if (item.quantity > remaining) {
          throw new BadRequestException(
            remaining === 0
              ? `"${orderItem.productName}" has already been returned`
              : `Only ${remaining} of "${orderItem.productName}" can still be returned`,
          );
        }
      }

      const saved = await manager.save(
        manager.create(ReturnEntity, {
          orderId: order.id,
          customerId,
          reason: dto.reason,
          items: dto.items.map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            conditionNotes: item.conditionNotes ?? null,
          })),
        }),
      );
      return saved.id;
    });

    return this.findOneForCustomer(customerId, returnId);
  }

  // Items are included so the Return Request page can work out how many of
  // each order item are still returnable before the customer submits.
  async findAllForCustomer(customerId: string): Promise<ReturnEntity[]> {
    return this.returnRepo.find({
      where: { customerId },
      relations: { order: true, refund: true, items: true },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOneForCustomer(
    customerId: string,
    returnId: string,
  ): Promise<ReturnEntity> {
    const returnRequest = await this.returnRepo.findOne({
      where: { id: returnId, customerId },
      relations: CUSTOMER_DETAIL_RELATIONS,
      order: { evidence: { createdAt: 'ASC' } },
    });
    if (!returnRequest) throw new NotFoundException('Return not found');
    await this.signEvidenceUrls(returnRequest.evidence);
    return returnRequest;
  }

  async uploadEvidence(
    customerId: string,
    returnId: string,
    file: { buffer: Buffer; mimetype: string } | undefined,
  ): Promise<ReturnEvidenceEntity> {
    const returnRequest = await this.returnRepo.findOne({
      where: { id: returnId, customerId },
    });
    if (!returnRequest) throw new NotFoundException('Return not found');
    // Photos are for the reviewer - once the return has been decided they
    // no longer change anything.
    if (returnRequest.status !== ReturnStatus.REQUESTED) {
      throw new BadRequestException(
        'Photos can only be added before the return is reviewed',
      );
    }
    if (!file) throw new BadRequestException('An image file is required');

    const ext = ALLOWED_IMAGE_TYPES[file.mimetype];
    if (!ext)
      throw new BadRequestException(
        'Only JPEG, PNG, or WebP images are allowed',
      );

    const count = await this.evidenceRepo.count({ where: { returnId } });
    if (count >= MAX_EVIDENCE_PER_RETURN) {
      throw new BadRequestException(
        `A return can have at most ${MAX_EVIDENCE_PER_RETURN} photos`,
      );
    }

    // Same bucket as product images, but under returns/ - which the bucket
    // policy does NOT make public (see infra/s3.tf). Random filename for
    // the same reason as product images: no collisions.
    const s3Key = `returns/${returnId}/${randomUUID()}.${ext}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const evidence = await this.evidenceRepo.save(
      this.evidenceRepo.create({ returnId, s3Key }),
    );
    // A new photo is activity on the return - same reasoning as a ticket
    // reply bumping the ticket's updated_at.
    await this.touch(returnId);
    await this.signEvidenceUrls([evidence]);
    return evidence;
  }

  // ---- Support-facing ----

  async findQueue(status?: ReturnStatus): Promise<ReturnEntity[]> {
    return this.returnRepo.find({
      where: status ? { status } : {},
      relations: { order: true, customer: true, refund: true },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOneForSupport(returnId: string): Promise<ReturnEntity> {
    const returnRequest = await this.returnRepo.findOne({
      where: { id: returnId },
      relations: {
        ...CUSTOMER_DETAIL_RELATIONS,
        customer: true,
        reviewer: true,
        refund: { processor: true },
      },
      order: { evidence: { createdAt: 'ASC' } },
    });
    if (!returnRequest) throw new NotFoundException('Return not found');

    // internal_notes is select: false on the entity, so it has to be asked
    // for by name - only ever here, on the staff side.
    const notes = await this.returnRepo.findOne({
      where: { id: returnId },
      select: { id: true, internalNotes: true },
    });
    returnRequest.internalNotes = notes?.internalNotes ?? null;

    await this.signEvidenceUrls(returnRequest.evidence);
    return returnRequest;
  }

  async updateStatus(
    staffId: string,
    returnId: string,
    dto: UpdateReturnStatusDto,
  ): Promise<ReturnEntity> {
    if (dto.status === undefined && dto.internalNotes === undefined) {
      throw new BadRequestException('Send a status, internal notes, or both');
    }

    await this.dataSource.transaction(async (manager) => {
      // Locked so two staff members can't both mark the same return
      // RECEIVED and put the stock back twice.
      const returnRequest = await manager.findOne(ReturnEntity, {
        where: { id: returnId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!returnRequest) throw new NotFoundException('Return not found');

      const changes: Partial<ReturnEntity> = {};
      if (dto.internalNotes !== undefined)
        changes.internalNotes = dto.internalNotes;

      // Sending the status it already has is treated as "no status change",
      // so the frontend can save notes without worrying about it.
      if (dto.status !== undefined && dto.status !== returnRequest.status) {
        if (!ALLOWED_TRANSITIONS[returnRequest.status].includes(dto.status)) {
          throw new BadRequestException(
            `Can't change a return from ${returnRequest.status} to ${dto.status}`,
          );
        }
        changes.status = dto.status;
        if (
          dto.status === ReturnStatus.APPROVED ||
          dto.status === ReturnStatus.REJECTED
        ) {
          changes.reviewedBy = staffId;
          changes.reviewedAt = new Date();
        }
        if (dto.status === ReturnStatus.RECEIVED) {
          await this.restock(manager, returnId, staffId);
        }
      }

      if (Object.keys(changes).length > 0) {
        await manager.update(ReturnEntity, returnId, changes);
      }
    });

    return this.findOneForSupport(returnId);
  }

  // ---- Helpers ----

  // How many of each order item are already on a return that's still
  // going ahead. Rejected returns don't count - those items never came back,
  // so the customer can try again.
  private async returnedQuantities(
    manager: EntityManager,
    orderId: string,
  ): Promise<Map<string, number>> {
    const items = await manager.find(ReturnItemEntity, {
      where: { returnRequest: { orderId, status: Not(ReturnStatus.REJECTED) } },
    });
    const totals = new Map<string, number>();
    for (const item of items) {
      totals.set(
        item.orderItemId,
        (totals.get(item.orderItemId) ?? 0) + item.quantity,
      );
    }
    return totals;
  }

  // The items are physically back in the warehouse, so they go back on the
  // shelf: available and total both go up (reserved is untouched - it was
  // already cleared on delivery). Each product also gets an
  // inventory_adjustments row so the stock history explains the increase.
  private async restock(
    manager: EntityManager,
    returnId: string,
    staffId: string,
  ): Promise<void> {
    const items = await manager.find(ReturnItemEntity, {
      where: { returnId },
      relations: { orderItem: true },
    });

    for (const item of items) {
      const { productId } = item.orderItem;
      const inventory = await manager.findOne(InventoryEntity, {
        where: { productId },
      });
      if (!inventory) {
        // The product was deleted after it was ordered - nothing to restock.
        this.logger.warn(
          `Return ${returnId}: product ${productId} no longer exists, not restocked`,
        );
        continue;
      }

      await manager.increment(
        InventoryEntity,
        { productId },
        'quantityAvailable',
        item.quantity,
      );
      await manager.increment(
        InventoryEntity,
        { productId },
        'quantityTotal',
        item.quantity,
      );
      await manager.save(
        manager.create(InventoryAdjustmentEntity, {
          productId,
          adjustmentType: AdjustmentType.INCREASE,
          quantityChange: item.quantity,
          reason: `Return #${returnId.slice(0, 8)} received`,
          adjustedBy: staffId,
        }),
      );
    }
  }

  private async touch(returnId: string): Promise<void> {
    await this.returnRepo
      .createQueryBuilder()
      .update()
      .set({ updatedAt: () => 'NOW()' })
      .where('id = :id', { id: returnId })
      .execute();
  }

  // Evidence photos aren't public, so each view gets fresh links that stop
  // working after 15 minutes.
  private async signEvidenceUrls(
    evidence: ReturnEvidenceEntity[],
  ): Promise<void> {
    await Promise.all(
      evidence.map(async (photo) => {
        photo.url = await getSignedUrl(
          this.s3,
          new GetObjectCommand({ Bucket: BUCKET, Key: photo.s3Key }),
          { expiresIn: SIGNED_URL_SECONDS },
        );
      }),
    );
  }
}
