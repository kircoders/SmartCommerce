// Phase 5

import { MigrationInterface, QueryRunner } from 'typeorm';

// Carts (and cart_items) are now temporary - deleted the moment an order
// is placed, instead of just having their status flipped to CHECKED_OUT
// (see OrdersService.placeOrder()). That makes orders.cart_id pointless:
// it would always end up referencing a cart that no longer exists the
// instant the order is created. order_items already permanently holds
// everything an order actually needs (product name, price, quantity), so
// this reference was never load-bearing to begin with.
export class CartsTemporaryRemoveOrderCartId1782777011374 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "cart_id"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN "cart_id" UUID`);
  }
}
