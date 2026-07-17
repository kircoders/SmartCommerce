// Phase 3

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventory1782777011367 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE inventory (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id          UUID NOT NULL UNIQUE REFERENCES products(id),
        quantity_available  INTEGER NOT NULL DEFAULT 0,
        quantity_reserved   INTEGER NOT NULL DEFAULT 0,
        quantity_total      INTEGER NOT NULL DEFAULT 0,
        low_stock_threshold INTEGER NOT NULL DEFAULT 0,
        updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE inventory_adjustments (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id        UUID NOT NULL REFERENCES products(id),
        adjustment_type   VARCHAR(20) NOT NULL,
        quantity_change   INTEGER NOT NULL,
        reason            TEXT,
        adjusted_by       UUID NOT NULL REFERENCES users(id),
        created_at        TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inventory_available ON inventory(quantity_available);
      CREATE INDEX idx_inventory_adjustments_product_id ON inventory_adjustments(product_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS inventory_adjustments`);
    await queryRunner.query(`DROP TABLE IF EXISTS inventory`);
  }
}
