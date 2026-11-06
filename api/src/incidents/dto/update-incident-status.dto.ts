// Phase 9

import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IncidentStatus } from '../entities/incident.entity';

// Shape + validation rules for the body of PATCH /api/incidents/:id/status.
export class UpdateIncidentStatusDto {
  @ApiProperty({ description: 'New incident status', enum: IncidentStatus })
  @IsEnum(IncidentStatus)
  status!: IncidentStatus;
}
