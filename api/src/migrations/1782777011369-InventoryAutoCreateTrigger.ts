// Phase 3

import { MigrationInterface, QueryRunner } from 'typeorm';

// Hardens the "every product has exactly one inventory row" guarantee.
// Until now that guarantee only existed in application code
// (ProductsService.create() calling InventoryService.createForProduct()
// right after saving) - correct for everything that goes through the app,
// but nothing would stop a product inserted outside of it (raw SQL, a
// script, a future code path that forgets to call it) from silently
// having no inventory row, same gap the BackfillInventory migration had
// to patch retroactively.
//
// This trigger makes it a database-level guarantee instead: Postgres
// itself creates the matching inventory row the instant a product is
// inserted, no application code involved at all.
export class InventoryAutoCreateTrigger1782777011369 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE FUNCTION create_inventory_for_product() RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO inventory (product_id) VALUES (NEW.id);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_create_inventory
      AFTER INSERT ON products
      FOR EACH ROW EXECUTE FUNCTION create_inventory_for_product();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_create_inventory ON products`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS create_inventory_for_product`);
  }
}
