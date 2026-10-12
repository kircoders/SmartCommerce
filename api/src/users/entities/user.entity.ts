// Phase 1

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
  WAREHOUSE_OPERATOR = 'WAREHOUSE_OPERATOR',
  OPERATIONS_MANAGER = 'OPERATIONS_MANAGER',
  ADMIN = 'ADMIN',
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  // select: false - never loaded by default, so it can't leak into any API
  // response that includes a user (e.g. a support ticket's customer or
  // agent). Only UsersService.findByEmailWithPassword() asks for it, for
  // the login check.
  @Column({ name: 'password_hash', length: 255, select: false })
  passwordHash!: string;

  @Column({ name: 'first_name', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', length: 100 })
  lastName!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
  role!: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  // TEMPORARY LEARNING EXAMPLE - commented out, not active.
  // @Column({ name: 'gender', length: 50, nullable: true })
  // gender?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
