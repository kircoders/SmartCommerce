// Phase 6

import { MigrationInterface, QueryRunner } from 'typeorm';

// One shipment per order (UNIQUE on order_id) - the simplified version this
// phase describes, not multiple partial shipments per order. status is
// plain text for now, matching orders.status's current pattern (not yet
// converted to a lookup table the way cart status was in Phase 5) -
// shipped_date/delivered_date start out empty and only get filled in once
// those things actually happen.
export class CreateShipments1782777011375 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE shipments (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id        UUID NOT NULL UNIQUE REFERENCES orders(id),
        status          VARCHAR(20) NOT NULL DEFAULT 'CREATED',
        tracking_number VARCHAR(100),
        shipped_date    TIMESTAMP,
        delivered_date  TIMESTAMP,
        created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS shipments`);
  }
}
