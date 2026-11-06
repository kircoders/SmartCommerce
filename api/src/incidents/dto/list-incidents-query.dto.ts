// Phase 9

import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
} from '../entities/incident.entity';

// Query string for GET /api/incidents. Every filter is optional and they
// combine (e.g. ?status=OPEN&severity=CRITICAL).
export class ListIncidentsQueryDto {
  @ApiPropertyOptional({ enum: IncidentStatus })
  @IsEnum(IncidentStatus)
  @IsOptional()
  status?: IncidentStatus;

  // What the dashboard's "Open" count means - OPEN or IN_PROGRESS. Ignored
  // if a specific status is also sent.
  @ApiPropertyOptional({
    enum: ['true'],
    description: 'Only OPEN and IN_PROGRESS incidents',
  })
  @IsIn(['true'])
  @IsOptional()
  unresolved?: 'true';

  @ApiPropertyOptional({ enum: IncidentSeverity })
  @IsEnum(IncidentSeverity)
  @IsOptional()
  severity?: IncidentSeverity;

  @ApiPropertyOptional({ enum: IncidentType })
  @IsEnum(IncidentType)
  @IsOptional()
  type?: IncidentType;

  @ApiPropertyOptional({ description: 'Searches title and description' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  q?: string;
}
