// Phase 9

import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentSeverity, IncidentType } from '../entities/incident.entity';

// Shape + validation rules for the body of POST /api/incidents. New
// incidents always start OPEN.
export class CreateIncidentDto {
  @ApiProperty({ description: 'Short summary', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ enum: IncidentType })
  @IsEnum(IncidentType)
  type!: IncidentType;

  @ApiProperty({ enum: IncidentSeverity })
  @IsEnum(IncidentSeverity)
  severity!: IncidentSeverity;

  @ApiProperty({ description: 'What happened' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ description: 'Related order' })
  @IsUUID()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({
    description:
      "Related shipment - if no orderId is sent, the shipment's order is linked too",
  })
  @IsUUID()
  @IsOptional()
  shipmentId?: string;

  @ApiPropertyOptional({ description: 'Initial notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
