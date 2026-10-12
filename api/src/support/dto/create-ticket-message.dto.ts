// Phase 7

import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Shape + validation rules for the body of POST .../messages - used by
// both the customer-facing and agent-facing reply endpoints, since a
// message is stored identically either way (sender_id is what tells them
// apart, set server-side from @CurrentUser(), not from this DTO).
export class CreateTicketMessageDto {
  @ApiProperty({ description: 'The reply text' })
  @IsString()
  @MinLength(1)
  message!: string;
}
