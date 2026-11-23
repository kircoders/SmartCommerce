// Phase 12

import { MigrationInterface, QueryRunner } from 'typeorm';

// One table: audit_logs - a permanent history of important actions (who did
// what, to which record, when). Rows are only ever INSERTed, by
// AuditInterceptor after a request succeeds; there's no update or delete
// endpoint. entity_id is nullable because not every action has one record
// it's "about" in a UUID table.
export class CreateAuditLogs1782777011381 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      UUID NOT NULL REFERENCES users(id),
        action       VARCHAR(50) NOT NULL,
        entity_type  VARCHAR(30) NOT NULL,
        entity_id    UUID,
        description  TEXT NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // The Audit Logs page lists newest first and filters by these columns.
    await queryRunner.query(
      `CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
  }
}
