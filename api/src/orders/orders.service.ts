// Phase 5

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CART_STATUS_IDS, CartEntity, CartStatus } from '../cart/entities/cart.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { ShipmentEntity, ShipmentStatus } from '../shipments/entities/shipment.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderEntity, OrderStatus } from './entities/order.entity';

// Deliberately self-contained for now, reading Cart/Inventory data through
// its own repositories rather than calling CartService/InventoryService -
// this is placeOrder()'s one genuinely hard requirement: create the order,
// create its items, deduct stock, AND delete the now-temporary cart must
// all succeed together or not at all. Calling those services' own methods wouldn't
// give that guarantee (each uses its own repository, outside this
// transaction), so this reaches into the same tables directly instead,
// all through one shared transaction manager. Deeper integration with
// CartService/InventoryService (so this logic isn't duplicated) is a
// follow-up, not done here.
@Injectable()
export class OrdersService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
  ) {}

  async placeOrder(customerId: string): Promise<OrderEntity> {
    return this.dataSource.transaction(async (manager) => {
      const cart = await manager.findOne(CartEntity, {
        where: { customerId, statusId: CART_STATUS_IDS[CartStatus.ACTIVE] },
        relations: { items: { product: true } },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      // Re-check stock one last time, inside the transaction - time has
      // passed since anything was added to the cart, and this is the
      // point of no return, same reasoning as CartService.validateCheckout,
      // just now actually enforced rather than just reported.
      for (const item of cart.items) {
        const inventory = await manager.findOne(InventoryEntity, {
          where: { productId: item.productId },
        });
        const available = inventory?.quantityAvailable ?? 0;
        if (item.quantity > available) {
          throw new BadRequestException(
            `Only ${available} of "${item.product.name}" ${available === 1 ? 'is' : 'are'} available`,
          );
        }
      }

      const totalAmount = cart.items.reduce(
        (sum, item) => sum + Number(item.unitPrice) * item.quantity,
        0,
      );

      const order = manager.create(OrderEntity, {
        customerId,
        totalAmount,
      });
      const savedOrder = await manager.save(order);

      const orderItems = cart.items.map((item) =>
        manager.create(OrderItemEntity, {
          orderId: savedOrder.id,
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }),
      );
      await manager.save(orderItems);

      // Reserve stock: move it from available to reserved, leaving total
      // unchanged (total = available + reserved). It only leaves total once
      // the shipment is delivered - see ShipmentsService.updateStatus().
      // Done directly against InventoryEntity rather than
      // InventoryService.createAdjustment(), since that method doesn't
      // currently accept a transaction manager and would fall outside this
      // one. No inventory_adjustments audit row gets written here yet as a
      // result - a real gap, worth fixing when this gets properly integrated.
      for (const item of cart.items) {
        await manager.decrement(
          InventoryEntity,
          { productId: item.productId },
          'quantityAvailable',
          item.quantity,
        );
        await manager.increment(
          InventoryEntity,
          { productId: item.productId },
          'quantityReserved',
          item.quantity,
        );
      }

      // Carts (and their cart_items, via ON DELETE CASCADE) are temporary -
      // once an order exists to permanently record the purchase, the cart
      // that led to it has no further purpose. Deleting it here, rather
      // than just flipping its status, is what actually makes that true.
      await manager.delete(CartEntity, cart.id);

      // Every order gets exactly one shipment the moment it's placed - a
      // CREATED shipment, waiting for the warehouse to pick it up. Created
      // in this same transaction so an order can never exist without one.
      const shipment = manager.create(ShipmentEntity, { orderId: savedOrder.id });
      await manager.save(shipment);

      return savedOrder;
    });
  }

  // Phase 12. A customer can cancel their own order until it ships (shipment
  // still CREATED or PACKED). Order status, shipment status, and stock all
  // change together in one transaction:
  //   - order    -> CANCELLED
  //   - shipment -> CANCELLED (drops off the warehouse queue)
  //   - stock    -> reserved goes back to available (undoes placeOrder;
  //                 total never changed, so it stays the same)
  async cancelOrder(customerId: string, orderId: string): Promise<OrderEntity> {
    await this.dataSource.transaction(async (manager) => {
      // Ownership first - someone else's order is a plain 404, so nobody
      // can learn which order IDs exist.
      const order = await manager.findOne(OrderEntity, {
        where: { id: orderId, customerId },
      });
      if (!order) throw new NotFoundException('Order not found');

      // Row-locked, same as ShipmentsService.updateStatus() - if the
      // warehouse marks it SHIPPED at the same moment, one of the two waits
      // for the other, then sees the new status. Both lock the shipment
      // first, so they can't deadlock.
      const shipment = await manager.findOne(ShipmentEntity, {
        where: { orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!shipment) throw new NotFoundException('Shipment not found');

      if (shipment.status === ShipmentStatus.CANCELLED) {
        throw new BadRequestException('This order is already cancelled');
      }
      if (
        shipment.status === ShipmentStatus.SHIPPED ||
        shipment.status === ShipmentStatus.DELIVERED
      ) {
        throw new BadRequestException(
          'This order has already shipped and can no longer be cancelled - request a return once it arrives',
        );
      }

      shipment.status = ShipmentStatus.CANCELLED;
      await manager.save(shipment);
      await manager.update(OrderEntity, orderId, { status: OrderStatus.CANCELLED });

      // Give the stock back - the exact reverse of placeOrder()'s reserve.
      const items = await manager.find(OrderItemEntity, { where: { orderId } });
      for (const item of items) {
        await manager.decrement(
          InventoryEntity,
          { productId: item.productId },
          'quantityReserved',
          item.quantity,
        );
        await manager.increment(
          InventoryEntity,
          { productId: item.productId },
          'quantityAvailable',
          item.quantity,
        );
      }
    });

    return this.findOneForCustomer(customerId, orderId);
  }

  async findAllForCustomer(customerId: string): Promise<OrderEntity[]> {
    return this.orderRepo.find({
      where: { customerId },
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForCustomer(customerId: string, orderId: string): Promise<OrderEntity> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
