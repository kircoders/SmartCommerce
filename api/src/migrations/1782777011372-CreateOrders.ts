// Phase 5

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrders1782777011372 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE orders (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id   UUID NOT NULL REFERENCES users(id),
        cart_id       UUID NOT NULL REFERENCES carts(id),
        status        VARCHAR(20) NOT NULL DEFAULT 'PLACED',
        total_amount  NUMERIC(10, 2) NOT NULL,
        created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_orders_customer_id ON orders(customer_id);
    `);

    // product_name and unit_price are both frozen snapshots, taken at the
    // moment the order is placed - same reasoning as cart_items.unitPrice,
    // just extended to the name too. A permanent order record needs to
    // stay accurate even if the real product is later renamed or deleted
    // entirely, which is exactly why product_id has no ON DELETE CASCADE
    // (or any delete behavior at all) - losing the product should never
    // silently corrupt someone's order history.
    await queryRunner.query(`
      CREATE TABLE order_items (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id    UUID NOT NULL REFERENCES products(id),
        product_name  VARCHAR(255) NOT NULL,
        quantity      INTEGER NOT NULL,
        unit_price    NUMERIC(10, 2) NOT NULL,
        created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (order_id, product_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_order_items_order_id ON order_items(order_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS order_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS orders`);
  }
}
