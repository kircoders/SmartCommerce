// Phase 8

import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReturnStatus } from '../entities/return.entity';

// REFUNDED isn't settable here - a return only becomes REFUNDED by creating
// a refund (POST /api/refunds), so the two can never disagree.
export const STAFF_SETTABLE_STATUSES = [
  ReturnStatus.APPROVED,
  ReturnStatus.REJECTED,
  ReturnStatus.RECEIVED,
] as const;

// Shape + validation rules for the body of
// PATCH /api/support/returns/:id/status. Both fields are optional so staff
// can change the status, update the internal notes, or both - but at least
// one has to be sent (checked in ReturnsService).
export class UpdateReturnStatusDto {
  @ApiPropertyOptional({
    description: 'New return status',
    enum: STAFF_SETTABLE_STATUSES,
  })
  @IsIn(STAFF_SETTABLE_STATUSES)
  @IsOptional()
  status?: ReturnStatus;

  @ApiPropertyOptional({
    description: 'Staff-only notes - never shown to the customer',
  })
  @IsString()
  @IsOptional()
  internalNotes?: string;
}
