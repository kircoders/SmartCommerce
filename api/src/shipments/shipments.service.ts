// Phase 6

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { OrderEntity, OrderStatus } from '../orders/entities/order.entity';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { UpdateTrackingNumberDto } from './dto/update-tracking-number.dto';
import { ShipmentEntity, ShipmentStatus } from './entities/shipment.entity';

// Maps a shipment status change onto the order status it should produce,
// per the spec: CREATED -> PROCESSING, PACKED has no order-status effect of
// its own (still PROCESSING), SHIPPED -> SHIPPED, DELIVERED -> DELIVERED.
const ORDER_STATUS_FOR_SHIPMENT_STATUS: Record<ShipmentStatus, OrderStatus> = {
  [ShipmentStatus.CREATED]: OrderStatus.PROCESSING,
  [ShipmentStatus.PACKED]: OrderStatus.PROCESSING,
  [ShipmentStatus.SHIPPED]: OrderStatus.SHIPPED,
  [ShipmentStatus.DELIVERED]: OrderStatus.DELIVERED,
};

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(ShipmentEntity)
    private readonly shipmentRepo: Repository<ShipmentEntity>,
  ) {}

  // Warehouse queue - every shipment, optionally narrowed to one status
  // (e.g. "show me only what's still CREATED and needs packing").
  async findQueue(status?: ShipmentStatus): Promise<ShipmentEntity[]> {
    return this.shipmentRepo.find({
      where: status ? { status } : {},
      relations: { order: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findOneForWarehouse(id: string): Promise<ShipmentEntity> {
    const shipment = await this.shipmentRepo.findOne({
      where: { id },
      relations: { order: true },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    return shipment;
  }

  // Scoped to the requesting customer's own order - a customer can look up
  // their shipment, but only for an order that's actually theirs.
  async findForCustomerOrder(customerId: string, orderId: string): Promise<ShipmentEntity> {
    const shipment = await this.shipmentRepo.findOne({
      where: { orderId, order: { customerId } },
      relations: { order: true },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    return shipment;
  }

  // Shipment status, order status, and (on delivery) inventory all change
  // together in one transaction - none of them can move without the others.
  async updateStatus(id: string, dto: UpdateShipmentStatusDto): Promise<ShipmentEntity> {
    await this.dataSource.transaction(async (manager) => {
      // Row-locked so two simultaneous "mark delivered" requests can't both
      // see a not-yet-delivered shipment and remove the stock twice. Loaded
      // without relations - Postgres rejects FOR UPDATE across outer joins.
      const shipment = await manager.findOne(ShipmentEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!shipment) throw new NotFoundException('Shipment not found');

      // DELIVERED is final. Allowing DELIVERED -> SHIPPED -> DELIVERED would
      // remove the same stock from inventory a second time.
      if (shipment.status === ShipmentStatus.DELIVERED) {
        throw new BadRequestException('Shipment has already been delivered');
      }

      shipment.status = dto.status;
      if (dto.status === ShipmentStatus.SHIPPED) {
        shipment.shippedDate = new Date();
      } else if (dto.status === ShipmentStatus.DELIVERED) {
        shipment.deliveredDate = new Date();
      }
      await manager.save(shipment);

      // Keep the order's own status in sync - a warehouse-side status change
      // is what actually moves the order forward from the customer's view.
      await manager.update(OrderEntity, shipment.orderId, {
        status: ORDER_STATUS_FOR_SHIPMENT_STATUS[dto.status],
      });

      // Finalize inventory: the reserved stock has physically left, so it
      // comes out of both reserved and total. Available was already reduced
      // when the order was placed, so it stays the same.
      if (dto.status === ShipmentStatus.DELIVERED) {
        const items = await manager.find(OrderItemEntity, {
          where: { orderId: shipment.orderId },
        });
        for (const item of items) {
          await manager.decrement(
            InventoryEntity,
            { productId: item.productId },
            'quantityReserved',
            item.quantity,
          );
          await manager.decrement(
            InventoryEntity,
            { productId: item.productId },
            'quantityTotal',
            item.quantity,
          );
        }
      }
    });

    return this.findOneForWarehouse(id);
  }

  async updateTrackingNumber(
    id: string,
    dto: UpdateTrackingNumberDto,
  ): Promise<ShipmentEntity> {
    const shipment = await this.findOneForWarehouse(id);
    shipment.trackingNumber = dto.trackingNumber;
    return this.shipmentRepo.save(shipment);
  }
}
