// Phase 7

import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Shape + validation rules for the body of
// PATCH /api/support/agent/tickets/:id/assign.
export class AssignTicketDto {
  @ApiProperty({ description: 'The support agent to assign this ticket to' })
  @IsUUID()
  agentId!: string;
}
