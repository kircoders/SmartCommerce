// Phase 1

import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// IsString() alone only checks the value is a string at all - "123" passes
// that just as easily as "Sherry" does, since it's a string of digits.
// Matches() additionally requires at least one real letter to appear
// somewhere, while still allowing spaces/hyphens/apostrophes for names
// like "Mary-Jane" or "O'Brien".
const NAME_PATTERN = /[a-zA-Z]/;

export class RegisterDto {
  @ApiProperty({ description: "Customer's first name", maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @Matches(NAME_PATTERN, { message: 'firstName must contain at least one letter' })
  firstName: string = '';

  @ApiProperty({ description: "Customer's last name", maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @Matches(NAME_PATTERN, { message: 'lastName must contain at least one letter' })
  lastName: string = '';

  @ApiProperty({ description: 'Email - must be unique across all accounts', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email: string = '';

  @ApiProperty({ description: 'Password, 8-100 characters. Hashed with bcrypt before storage.', minLength: 8, maxLength: 100 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string = '';

  // TEMPORARY LEARNING EXAMPLE - commented out, not active.
  // @ApiPropertyOptional({ description: 'Gender', maxLength: 50 })
  // @IsOptional()
  // @IsString()
  // @MaxLength(50)
  // gender?: string;
}
