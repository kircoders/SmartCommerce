// Phase 2

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductEntity } from './product.entity';

// Maps to the "product_images" table. Each row is one uploaded image
// belonging to a product.
@Entity('product_images')
export class ProductImageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Raw foreign key column, kept alongside the `product` relation below so
  // it can be queried/filtered on directly (e.g. `where: { productId }`)
  // without needing to join.
  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  // onDelete: 'CASCADE' - deleting a product row in Postgres automatically
  // deletes its image rows too. (The S3 *objects* still need to be cleaned
  // up manually though - that's handled in ProductsService.remove(), since
  // Postgres cascading can't reach out to S3.)
  @ManyToOne(() => ProductEntity, (product) => product.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  // Public S3 URL - what the frontend actually renders in an <img> tag.
  @Column({ type: 'varchar', length: 2048 })
  url!: string;

  // The S3 object key (path within the bucket), e.g.
  // "products/{productId}/{uuid}.jpg". Needed to delete the actual object
  // from S3 later - the public `url` alone isn't enough for that.
  @Column({ name: 's3_key', type: 'varchar', length: 1024 })
  s3Key!: string;

  // Marks which image is the "main" one shown in listings/cards. Only one
  // image per product should have this set true - ProductsService enforces
  // that by flipping all others off whenever a new primary is uploaded.
  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
