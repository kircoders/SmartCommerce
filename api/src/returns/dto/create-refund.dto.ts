// Phase 8

import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Shape + validation rules for the body of POST /api/refunds. No amount
// field - the server calculates it from what's being returned and the
// prices actually paid, so it can't be mistyped or inflated.
export class CreateRefundDto {
  @ApiProperty({ description: 'The RECEIVED return to refund' })
  @IsUUID()
  returnId!: string;
}
