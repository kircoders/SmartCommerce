// Phase 4

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductEntity } from '../../products/entities/product.entity';
import { CartEntity } from './cart.entity';

// Maps to the "cart_items" table - one row per distinct product sitting in
// a cart. No customerId here (reachable via cart.customerId - storing it
// twice would be a normalization violation), and no "bought" flag either
// (that's carts.status, since a whole cart checks out together, never
// individual items).
//
// unitPrice is a deliberate exception to "don't duplicate data" -
// products.price already exists, but this column freezes what the price
// WAS at the moment the item was added, so a later price change on the
// product doesn't silently change what's already sitting in someone's cart.
@Entity('cart_items')
export class CartItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'cart_id', type: 'uuid' })
  cartId!: string;

  // onDelete: 'CASCADE' - deleting a cart automatically deletes its items
  // at the database level (matches ON DELETE CASCADE in the migration).
  @ManyToOne(() => CartEntity, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart!: CartEntity;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  // No onDelete here, same reasoning as inventory/inventory_adjustments -
  // deleting a product should never silently corrupt someone's cart.
  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 10, scale: 2 })
  unitPrice!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
