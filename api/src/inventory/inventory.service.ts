// Phase 3

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { InventoryAdjustmentEntity } from './entities/inventory-adjustment.entity';
import { InventoryEntity } from './entities/inventory.entity';

// All the business logic for inventory tracking. Two entities, two
// repositories - InventoryEntity is "current state" (one row per product,
// overwritten as stock changes), InventoryAdjustmentEntity is "history"
// (append-only, a new row per change, never edited).
@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryEntity)
    private readonly inventoryRepo: Repository<InventoryEntity>,
    @InjectRepository(InventoryAdjustmentEntity)
    private readonly adjustmentRepo: Repository<InventoryAdjustmentEntity>,
  ) {}

  async findAll(): Promise<InventoryEntity[]> {
    return this.inventoryRepo.find({
      relations: { product: true },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(productId: string): Promise<InventoryEntity> {
    const inventory = await this.inventoryRepo.findOne({
      where: { productId },
      relations: { product: true },
    });
    if (!inventory) throw new NotFoundException('Inventory record not found');
    return inventory;
  }

  // quantity_available <= low_stock_threshold compares two columns against
  // each other, which TypeORM's plain `where: {...}` object can't express
  // (it only compares a column to a fixed value) - this needs the raw
  // query builder instead.
  async findLowStock(): Promise<InventoryEntity[]> {
    return this.inventoryRepo
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .where('inventory.quantity_available <= inventory.low_stock_threshold')
      .getMany();
  }

  // Direct/corrective update - no audit row created here. Object.assign
  // works the same way it did for products.service.ts's update(): only
  // fields present on dto get overwritten.
  async update(productId: string, dto: UpdateInventoryDto): Promise<InventoryEntity> {
    const inventory = await this.findOne(productId);
    Object.assign(inventory, dto);
    return this.inventoryRepo.save(inventory);
  }

  // The audited path. Applies the change to the CURRENT totals in
  // `inventory` AND writes a permanent row to `inventory_adjustments` -
  // both have to happen together, or the audit log and the actual stock
  // level would drift out of sync with each other.
  async createAdjustment(
    dto: CreateAdjustmentDto,
    userId: string,
  ): Promise<InventoryAdjustmentEntity> {
    const inventory = await this.findOne(dto.productId);

    const newAvailable = inventory.quantityAvailable + dto.quantityChange;
    if (newAvailable < 0) {
      throw new BadRequestException('Adjustment would result in negative available stock');
    }

    inventory.quantityAvailable = newAvailable;
    inventory.quantityTotal = inventory.quantityTotal + dto.quantityChange;
    await this.inventoryRepo.save(inventory);

    const adjustment = this.adjustmentRepo.create({
      productId: dto.productId,
      adjustmentType: dto.adjustmentType,
      quantityChange: dto.quantityChange,
      reason: dto.reason ?? null,
      adjustedBy: userId,
    });
    return this.adjustmentRepo.save(adjustment);
  }

  async findAdjustments(productId: string): Promise<InventoryAdjustmentEntity[]> {
    return this.adjustmentRepo.find({
      where: { productId },
      order: { createdAt: 'DESC' },
    });
  }

  // Called from ProductsService.remove() before the product row itself is
  // deleted - inventory.product_id and inventory_adjustments.product_id
  // both reference products(id) with no ON DELETE CASCADE, so deleting a
  // product without this first would fail with a foreign key violation.
  // Adjustment history is deleted here too rather than kept orphaned -
  // once the product is gone, an audit trail for it has no home.
  async deleteForProduct(productId: string): Promise<void> {
    await this.adjustmentRepo.delete({ productId });
    await this.inventoryRepo.delete({ productId });
  }

  // Called from ProductsService's public read methods (findAll/findOne/
  // search) to attach stock info to the catalog. Returns the real
  // quantityAvailable + lowStockThreshold per product - a deliberate
  // choice to show customers "only 3 left!" urgency messaging, same as
  // most ecommerce sites. (Reserved quantity and adjustment history stay
  // behind the WAREHOUSE_OPERATOR/OPERATIONS_MANAGER/ADMIN-only inventory
  // endpoints - only these two fields go public.)
  async getStockInfoMap(
    productIds: string[],
  ): Promise<Record<string, { quantityAvailable: number; lowStockThreshold: number }>> {
    if (productIds.length === 0) return {};
    const rows = await this.inventoryRepo.find({
      where: { productId: In(productIds) },
      select: { productId: true, quantityAvailable: true, lowStockThreshold: true },
    });
    const map: Record<string, { quantityAvailable: number; lowStockThreshold: number }> = {};
    for (const row of rows) {
      map[row.productId] = {
        quantityAvailable: row.quantityAvailable,
        lowStockThreshold: row.lowStockThreshold,
      };
    }
    return map;
  }
}
