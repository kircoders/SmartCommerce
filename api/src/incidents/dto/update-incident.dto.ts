// Phase 9

import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentSeverity, IncidentType } from '../entities/incident.entity';

// Shape + validation rules for the body of PUT /api/incidents/:id - edits
// the details. Every field is optional so the frontend can send only what
// changed, but at least one has to be sent (checked in IncidentsService).
// Status changes go through PATCH /:id/status instead, so the transition
// rules live in one place.
export class UpdateIncidentDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ enum: IncidentType })
  @IsEnum(IncidentType)
  @IsOptional()
  type?: IncidentType;

  @ApiPropertyOptional({ enum: IncidentSeverity })
  @IsEnum(IncidentSeverity)
  @IsOptional()
  severity?: IncidentSeverity;

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Replaces the notes; "" clears them' })
  @IsString()
  @IsOptional()
  notes?: string;
}
