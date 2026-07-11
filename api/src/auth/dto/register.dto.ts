// Phase 1

import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MaxLength(100)
  firstName: string = '';

  @IsString()
  @MaxLength(100)
  lastName: string = '';

  @IsEmail()
  @MaxLength(255)
  email: string = '';

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string = '';
}
