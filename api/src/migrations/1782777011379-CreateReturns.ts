// Phase 8

import { MigrationInterface, QueryRunner } from 'typeorm';

// Four tables:
//   returns          - one row per return request (a customer can file more
//                      than one return against the same order)
//   return_items     - which order items are coming back, and how many
//   return_evidence  - photos the customer uploaded; only the S3 key lives
//                      here, the image itself lives in S3
//   refunds          - the money record, at most one per return
//                      (return_id is UNIQUE)
//
// return_evidence isn't in the spec's table list, but the spec does say
// "only file references will be stored in PostgreSQL" - a return can have
// several photos, so they need their own table rather than a column.
export class CreateReturns1782777011379 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE returns (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id        UUID NOT NULL REFERENCES orders(id),
        customer_id     UUID NOT NULL REFERENCES users(id),
        reason          TEXT NOT NULL,
        status          VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
        internal_notes  TEXT,
        requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_by     UUID REFERENCES users(id),
        reviewed_at     TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE return_items (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_id        UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
        order_item_id    UUID NOT NULL REFERENCES order_items(id),
        quantity         INTEGER NOT NULL CHECK (quantity > 0),
        condition_notes  TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE return_evidence (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_id   UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
        s3_key      VARCHAR(1024) NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE refunds (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_id     UUID NOT NULL UNIQUE REFERENCES returns(id),
        order_id      UUID NOT NULL REFERENCES orders(id),
        amount        NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
        status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        processed_by  UUID REFERENCES users(id),
        processed_at  TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS refunds`);
    await queryRunner.query(`DROP TABLE IF EXISTS return_evidence`);
    await queryRunner.query(`DROP TABLE IF EXISTS return_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS returns`);
  }
}
