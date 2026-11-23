// Phase 12

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AuditAction, AuditEntityType } from '../entities/audit-log.entity';

export const DEFAULT_AUDIT_PAGE_SIZE = 25;
export const MAX_AUDIT_PAGE_SIZE = 100;

// Query string for GET /api/admin/audit-logs. Every filter is optional and
// they combine, e.g. ?action=REFUND_PROCESSED&from=2026-11-01&page=2
export class ListAuditLogsQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Only actions by this user',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ enum: AuditEntityType })
  @IsEnum(AuditEntityType)
  @IsOptional()
  entityType?: AuditEntityType;

  @ApiPropertyOptional({ enum: AuditAction })
  @IsEnum(AuditAction)
  @IsOptional()
  action?: AuditAction;

  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'On or after this date/time (ISO 8601)',
  })
  @IsISO8601()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-11-30',
    description:
      'On or before this date (a date includes the whole day) or date/time (ISO 8601)',
  })
  @IsISO8601()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({
    description: "Searches the description and the user's name and email",
  })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  q?: string;

  // Query strings are always text - @Type turns "2" into the number 2.
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    default: DEFAULT_AUDIT_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_AUDIT_PAGE_SIZE,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_AUDIT_PAGE_SIZE)
  @IsOptional()
  pageSize?: number;
}
