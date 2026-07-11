// Phase 2

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { ProductImageEntity } from './product-image.entity';

// Maps to the "products" table. TypeORM uses this class to generate the
// migration schema and to hydrate/persist rows as ProductEntity instances.
@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // "numeric" (not float/double) so money math doesn't suffer floating-point
  // rounding errors. precision 10, scale 2 = up to 8 digits before the
  // decimal point, 2 after (e.g. 99999999.99).
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price!: number;

  // Soft-delete flag. Products are never actually removed from the table
  // by normal deactivation - findAll/findOne/search all filter on
  // isActive: true, so setting this to false just hides it from customers.
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  // Foreign key (raw UUID column) to the admin user who created this
  // product - stored separately from the `creator` relation below so it
  // can be used directly (e.g. in queries) without loading the full user.
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  // The actual relation - lets you do product.creator.email etc. when
  // eager-loaded/joined. Not loaded by default (TypeORM relations are
  // lazy unless explicitly requested).
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;

  // One product can have many images. `cascade: true` means saving a
  // product with new/changed images in this array will also save those
  // image rows - you don't need to save them separately.
  @OneToMany(() => ProductImageEntity, (image) => image.product, { cascade: true })
  images!: ProductImageEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
