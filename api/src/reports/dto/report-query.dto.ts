// Phase 10

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// How the timeline in each report is bucketed - one row per day, per week
// (weeks start on Monday), or per month. This is what makes a report a
// "daily", "weekly", or "monthly" business summary.
export enum ReportGroupBy {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// "Which day did this order happen on?" depends on where you are - 9pm in
// New York is already tomorrow in UTC. The browser sends its time zone so
// "today" means the manager's today. Intl throws on a name it doesn't know,
// which is how we check it's real before it reaches the database.
@ValidatorConstraint({ name: 'isTimeZone' })
class IsTimeZoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return 'timeZone must be a valid IANA time zone, like America/New_York';
  }
}

// Query string shared by every /api/reports endpoint, e.g.
//   ?from=2026-11-01&to=2026-11-09&groupBy=day&timeZone=America/New_York
// All optional: the default is the last 30 days, by day, in UTC.
export class ReportQueryDto {
  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'First day included (YYYY-MM-DD)',
  })
  @Matches(DATE_ONLY, { message: 'from must be a date like 2026-11-01' })
  @IsISO8601({ strict: true }, { message: 'from must be a real date' })
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-11-09',
    description: 'Last day included (YYYY-MM-DD)',
  })
  @Matches(DATE_ONLY, { message: 'to must be a date like 2026-11-09' })
  @IsISO8601({ strict: true }, { message: 'to must be a real date' })
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ enum: ReportGroupBy, default: ReportGroupBy.DAY })
  @IsEnum(ReportGroupBy)
  @IsOptional()
  groupBy?: ReportGroupBy;

  @ApiPropertyOptional({ example: 'America/New_York', default: 'UTC' })
  @IsString()
  @MaxLength(64)
  @Validate(IsTimeZoneConstraint)
  @IsOptional()
  timeZone?: string;
}
