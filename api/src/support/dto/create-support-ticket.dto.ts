// Phase 7

import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketCategory } from '../entities/support-ticket.entity';

// Shape + validation rules for the body of POST /api/support/tickets.
// customerId is NOT here - same reasoning as adjustedBy on
// CreateAdjustmentDto - it comes from @CurrentUser() server-side.
export class CreateSupportTicketDto {
  @ApiPropertyOptional({ description: 'The order this complaint relates to, if any' })
  @IsUUID()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ description: 'Complaint category', enum: TicketCategory })
  @IsEnum(TicketCategory)
  category!: TicketCategory;

  @ApiProperty({ description: 'Short summary of the issue', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ description: 'Full description of the issue' })
  @IsString()
  description!: string;
}
