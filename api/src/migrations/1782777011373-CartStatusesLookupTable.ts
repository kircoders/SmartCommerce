// Phase 5

import { MigrationInterface, QueryRunner } from 'typeorm';

// carts.status was originally just VARCHAR(20) - the database itself had
// no idea what values were even valid, "BANANA" would have been accepted
// just as happily as "ACTIVE". This normalizes it into a proper lookup
// table: cart_statuses holds exactly one row per valid status (id + name),
// and carts.status_id becomes a real foreign key pointing at it - the
// database now genuinely enforces "this must be one of the 3 real
// statuses," not just the application code.
export class CartStatusesLookupTable1782777011373 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cart_statuses" (
        "id"   INTEGER PRIMARY KEY,
        "name" VARCHAR(20) NOT NULL UNIQUE
      )
    `);

    await queryRunner.query(`
      INSERT INTO "cart_statuses" ("id", "name") VALUES
        (1, 'ACTIVE'),
        (2, 'CHECKED_OUT'),
        (3, 'ABANDONED')
    `);

    await queryRunner.query(`
      ALTER TABLE "carts" ADD COLUMN "status_id" INTEGER REFERENCES "cart_statuses"("id")
    `);

    // Convert every existing row's old text status into the matching new id.
    await queryRunner.query(`
      UPDATE "carts" SET "status_id" = CASE "status"
        WHEN 'ACTIVE' THEN 1
        WHEN 'CHECKED_OUT' THEN 2
        WHEN 'ABANDONED' THEN 3
      END
    `);

    await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "status_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "status_id" SET DEFAULT 1`);

    // The old partial unique index referenced the text column directly -
    // has to be rebuilt against status_id now that status itself is gone.
    await queryRunner.query(`DROP INDEX "idx_carts_one_active_per_customer"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_carts_one_active_per_customer"
      ON "carts"("customer_id") WHERE "status_id" = 1
    `);

    await queryRunner.query(`ALTER TABLE "carts" DROP COLUMN "status"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "carts" ADD COLUMN "status" VARCHAR(20)`);
    await queryRunner.query(`
      UPDATE "carts" c SET "status" = cs."name"
      FROM "cart_statuses" cs WHERE cs."id" = c."status_id"
    `);
    await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "status" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "carts" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'`);

    await queryRunner.query(`DROP INDEX "idx_carts_one_active_per_customer"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_carts_one_active_per_customer"
      ON "carts"("customer_id") WHERE "status" = 'ACTIVE'
    `);

    await queryRunner.query(`ALTER TABLE "carts" DROP COLUMN "status_id"`);
    await queryRunner.query(`DROP TABLE "cart_statuses"`);
  }
}
