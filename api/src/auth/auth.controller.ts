// Phase 1

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Audit, child, field } from '../audit-logs/audit.decorator';
import {
  AuditAction,
  AuditEntityType,
} from '../audit-logs/entities/audit-log.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ThrottlerGuard (Phase 12): 5 tries per minute per IP, then 429 Too Many
  // Requests - makes password guessing and account spam impractical.
  @Post('register')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Register a new customer account' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Audit({
    action: AuditAction.LOGIN,
    entityType: AuditEntityType.USER,
    // Nobody is logged in yet, so the user comes from the login response.
    actorId: ({ data }) => field(child(data, 'user'), 'id') || null,
    entityId: ({ data }) => field(child(data, 'user'), 'id') || null,
    describe: ({ data }) => `${field(child(data, 'user'), 'email')} logged in`,
  })
  @ApiOperation({ summary: 'Log in and receive a JWT access token' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @Audit({
    action: AuditAction.LOGOUT,
    entityType: AuditEntityType.USER,
    entityId: ({ userId }) => userId,
    describe: () => 'Logged out',
  })
  @ApiOperation({ summary: 'Log out the current session' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async logout() {
    return { message: 'Logged out successfully' };
  }
}
