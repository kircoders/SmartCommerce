// Phase 1

import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Account email' })
  @IsEmail()
  email: string = '';

  @ApiProperty({ description: 'Account password' })
  @IsString()
  password: string = '';
}
