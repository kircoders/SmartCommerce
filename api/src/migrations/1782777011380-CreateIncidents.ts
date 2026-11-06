// Phase 9

import { MigrationInterface, QueryRunner } from 'typeorm';

// One table: incidents - internal business problems (a delayed shipment, an
// inventory mismatch, a customer escalation...) tracked by operations
// managers and admins. An incident can optionally point at the order and/or
// shipment it's about; IncidentsService checks that a linked shipment
// belongs to the linked order.
export class CreateIncidents1782777011380 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE incidents (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_by   UUID NOT NULL REFERENCES users(id),
        order_id     UUID REFERENCES orders(id),
        shipment_id  UUID REFERENCES shipments(id),
        type         VARCHAR(30) NOT NULL,
        severity     VARCHAR(20) NOT NULL,
        status       VARCHAR(20) NOT NULL DEFAULT 'OPEN',
        title        VARCHAR(200) NOT NULL,
        description  TEXT NOT NULL,
        notes        TEXT,
        resolved_at  TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS incidents`);
  }
}
