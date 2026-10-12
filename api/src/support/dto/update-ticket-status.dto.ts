// Phase 7

import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus } from '../entities/support-ticket.entity';

// Shape + validation rules for the body of
// PATCH /api/support/agent/tickets/:id/status.
export class UpdateTicketStatusDto {
  @ApiProperty({ description: 'New ticket status', enum: TicketStatus })
  @IsEnum(TicketStatus)
  status!: TicketStatus;
}
