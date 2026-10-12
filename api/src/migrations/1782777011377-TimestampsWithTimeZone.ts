// Phase 7

import { MigrationInterface, QueryRunner } from 'typeorm';

// closed_at, shipped_date, and delivered_date are the only timestamps set
// by Node (new Date()) rather than by the database (NOW()). As plain
// TIMESTAMP columns they dropped the time zone: Node wrote the machine's
// local time, which was then read back as if it were UTC - 7 hours off on
// a Pacific-time laptop. TIMESTAMPTZ stores an exact instant instead.
//
// Every existing value was written by a local dev server (Phases 6-7 were
// never deployed before this fix), so existing values are converted as
// Pacific time. down() converts back the same way.
const COLUMNS: ReadonlyArray<[table: string, column: string]> = [
  ['support_tickets', 'closed_at'],
  ['shipments', 'shipped_date'],
  ['shipments', 'delivered_date'],
];

export class TimestampsWithTimeZone1782777011377 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column] of COLUMNS) {
      await queryRunner.query(`
        ALTER TABLE ${table}
          ALTER COLUMN ${column} TYPE TIMESTAMPTZ
          USING ${column} AT TIME ZONE 'America/Los_Angeles'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column] of COLUMNS) {
      await queryRunner.query(`
        ALTER TABLE ${table}
          ALTER COLUMN ${column} TYPE TIMESTAMP
          USING ${column} AT TIME ZONE 'America/Los_Angeles'
      `);
    }
  }
}
