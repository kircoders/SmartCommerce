// Phase 8

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReturnEntity } from './return.entity';

// Maps to "return_evidence" - one row per photo a customer uploaded. Unlike
// product_images there's no stored public URL: evidence photos are private,
// so only the S3 key is saved and ReturnsService hands out short-lived
// signed links when a return is viewed.
@Entity('return_evidence')
export class ReturnEvidenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'return_id', type: 'uuid' })
  returnId!: string;

  @ManyToOne(() => ReturnEntity, (returnRequest) => returnRequest.evidence, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'return_id' })
  returnRequest!: ReturnEntity;

  @Column({ name: 's3_key', type: 'varchar', length: 1024 })
  s3Key!: string;

  // Not a column - filled in by ReturnsService with a signed link that
  // expires after a few minutes.
  url?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
