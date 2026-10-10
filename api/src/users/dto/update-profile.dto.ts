// Phase 1

import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// See register.dto.ts - IsString() alone lets "123" through as a valid
// name, since it's still a string. Matches() additionally requires at
// least one real letter to appear somewhere.
const NAME_PATTERN = /[a-zA-Z]/;

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'New first name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(NAME_PATTERN, { message: 'firstName must contain at least one letter' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'New last name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(NAME_PATTERN, { message: 'lastName must contain at least one letter' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'New email', maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}
