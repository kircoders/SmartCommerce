// Phase 7

import { MigrationInterface, QueryRunner } from 'typeorm';

// Every remaining plain TIMESTAMP column is a created_at/updated_at filled by
// the database (NOW()). The database runs in UTC, so it stored UTC wall-clock
// times - but the Postgres driver reads a plain TIMESTAMP as being in the
// *reading machine's* time zone, so on a Pacific-time laptop every one of
// these came back 7 hours in the future. (On App Runner, which runs in UTC,
// the mistake happened to cancel out.) TIMESTAMPTZ stores an exact instant,
// so it reads correctly everywhere.
//
// Existing values were written by the UTC database, so they're converted as
// UTC. Completes 1782777011377, which converted the three Node-written
// columns.
const COLUMNS: ReadonlyArray<[table: string, column: string]> = [
  ['cart_items', 'created_at'],
  ['cart_items', 'updated_at'],
  ['carts', 'created_at'],
  ['carts', 'updated_at'],
  ['inventory', 'updated_at'],
  ['inventory_adjustments', 'created_at'],
  ['order_items', 'created_at'],
  ['order_items', 'updated_at'],
  ['orders', 'created_at'],
  ['orders', 'updated_at'],
  ['product_images', 'created_at'],
  ['products', 'created_at'],
  ['products', 'updated_at'],
  ['shipments', 'created_at'],
  ['shipments', 'updated_at'],
  ['support_ticket_messages', 'created_at'],
  ['support_tickets', 'created_at'],
  ['support_tickets', 'updated_at'],
  ['users', 'created_at'],
  ['users', 'updated_at'],
];

export class AllTimestampsWithTimeZone1782777011378 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column] of COLUMNS) {
      await queryRunner.query(`
        ALTER TABLE ${table}
          ALTER COLUMN ${column} TYPE TIMESTAMPTZ
          USING ${column} AT TIME ZONE 'UTC'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column] of COLUMNS) {
      await queryRunner.query(`
        ALTER TABLE ${table}
          ALTER COLUMN ${column} TYPE TIMESTAMP
          USING ${column} AT TIME ZONE 'UTC'
      `);
    }
  }
}
