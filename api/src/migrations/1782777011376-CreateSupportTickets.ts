// Phase 7

import { MigrationInterface, QueryRunner } from 'typeorm';

// Two tables: support_tickets (one row per complaint) and
// support_ticket_messages (the conversation thread on each ticket - both
// the customer's original complaint AND every reply, customer or agent,
// live here as separate message rows, not just on the ticket itself).
//
// order_id and assigned_agent_id are both nullable - a ticket doesn't have
// to be about a specific order (category "Other"), and a brand-new ticket
// starts unassigned, waiting for a support agent to pick it up.
export class CreateSupportTickets1782777011376 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE support_tickets (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id        UUID NOT NULL REFERENCES users(id),
        order_id           UUID REFERENCES orders(id),
        assigned_agent_id  UUID REFERENCES users(id),
        category           VARCHAR(30) NOT NULL,
        subject            VARCHAR(200) NOT NULL,
        description        TEXT NOT NULL,
        priority           VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
        status             VARCHAR(25) NOT NULL DEFAULT 'OPEN',
        created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMP NOT NULL DEFAULT NOW(),
        closed_at          TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE support_ticket_messages (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        sender_id   UUID NOT NULL REFERENCES users(id),
        message     TEXT NOT NULL,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS support_ticket_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS support_tickets`);
  }
}
