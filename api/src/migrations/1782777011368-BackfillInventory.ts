// Phase 3

import { MigrationInterface, QueryRunner } from 'typeorm';

// Every product now gets an inventory row automatically at creation time
// (see ProductsService.create()) - but that only applies going forward.
// Products created before that code existed (all of Phase 2's testing,
// plus early Phase 3 testing) have no inventory row at all, which meant
// they silently showed as out-of-stock on the public catalog. This
// one-time backfill gives every existing product without one a fresh
// zeroed-out inventory row, same as if it had just been created.
export class BackfillInventory1782777011368 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO inventory (product_id)
      SELECT p.id FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      WHERE i.id IS NULL
    `);
  }

  // Irreversible on purpose - there's no way to distinguish which
  // inventory rows this backfill created versus ones created normally
  // afterward, so "down" doesn't attempt to undo it.
  public async down(): Promise<void> {}
}
