// Phase 2

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProducts1782777011366 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE products (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(255) NOT NULL,
        description TEXT,
        price       NUMERIC(10, 2) NOT NULL,
        is_active   BOOLEAN NOT NULL DEFAULT true,
        created_by  UUID NOT NULL REFERENCES users(id),
        created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE product_images (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        url         VARCHAR(2048) NOT NULL,
        s3_key      VARCHAR(1024) NOT NULL,
        is_primary  BOOLEAN NOT NULL DEFAULT false,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_products_is_active ON products(is_active);
      CREATE INDEX idx_products_name ON products(name);
      CREATE INDEX idx_product_images_product_id ON product_images(product_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS product_images`);
    await queryRunner.query(`DROP TABLE IF EXISTS products`);
  }
}
