// Phase 4

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCarts1782777011370 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE carts (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id  UUID NOT NULL REFERENCES users(id),
        status       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Partial unique index (only applies to rows where status = 'ACTIVE') -
    // enforces "one active cart per customer" at the database level, while
    // still allowing a customer to have many CHECKED_OUT/ABANDONED carts
    // in their history. A plain UNIQUE(customer_id) would be wrong here -
    // it would block a customer from ever having a second cart row at all.
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_carts_one_active_per_customer
      ON carts(customer_id) WHERE status = 'ACTIVE'
    `);

    await queryRunner.query(`
      CREATE TABLE cart_items (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cart_id      UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
        product_id   UUID NOT NULL REFERENCES products(id),
        quantity     INTEGER NOT NULL,
        unit_price   NUMERIC(10, 2) NOT NULL,
        created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (cart_id, product_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cart_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS carts`);
  }
}
