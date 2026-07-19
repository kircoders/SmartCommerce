// Phase 1

import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: "Get the current user's own profile" })
  async getProfile(@CurrentUser() user: UserEntity) {
    return { data: sanitize(user) };
  }

  @Put('me')
  @ApiOperation({ summary: "Update the current user's own profile (name/email only)" })
  async updateProfile(
    @CurrentUser() user: UserEntity,
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.usersService.updateProfile(user.id, dto);
    return { data: sanitize(updated) };
  }
}

function sanitize(user: UserEntity) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}
