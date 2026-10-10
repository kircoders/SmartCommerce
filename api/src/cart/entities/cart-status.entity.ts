// Phase 5

import { Column, Entity, PrimaryColumn } from 'typeorm';

// Maps to the "cart_statuses" lookup table - exactly 3 rows, one per valid
// cart status, seeded by the migration and never changed at runtime.
// PrimaryColumn (not PrimaryGeneratedColumn) because these ids are fixed,
// meaningful numbers assigned by hand (1 = ACTIVE, etc.), not
// auto-generated - see CART_STATUS_IDS in cart.entity.ts for the mapping.
@Entity('cart_statuses')
export class CartStatusEntity {
  @PrimaryColumn()
  id!: number;

  @Column({ unique: true, length: 20 })
  name!: string;
}
