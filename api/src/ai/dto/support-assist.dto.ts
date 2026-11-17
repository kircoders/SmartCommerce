// Phase 11

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const MAX_ASSIST_QUESTION_LENGTH = 1000;

// "Explain issue" on the staff ticket page. With no question, the AI
// explains what the customer's problem is and what to check next; with one,
// it answers that question about the ticket.
export class SupportAssistDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  ticketId!: string;

  @ApiPropertyOptional({ example: 'Has this order actually been delivered?' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_ASSIST_QUESTION_LENGTH)
  question?: string;
}
