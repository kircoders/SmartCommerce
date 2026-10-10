// TEMPORARY LEARNING EXAMPLE - fully commented out, not active.
// Matches api/src/users/entities/user.entity.ts and
// api/src/auth/dto/register.dto.ts - uncomment all three together
// (plus the line in auth.service.ts) to make the "gender" field real.
// Tear down (delete this file, revert the other three) when done.

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGenderToUsers1782777011371 implements MigrationInterface {
    name = 'AddGenderToUsers1782777011371'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "gender" character varying(50)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "gender"`);
    }
}
