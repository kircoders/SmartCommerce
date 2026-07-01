import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 10;

const ROLE_REDIRECT: Record<UserRole, string> = {
  [UserRole.CUSTOMER]: '/dashboard/customer',
  [UserRole.SUPPORT_AGENT]: '/dashboard/support',
  [UserRole.WAREHOUSE_OPERATOR]: '/dashboard/warehouse',
  [UserRole.OPERATIONS_MANAGER]: '/dashboard/operations',
  [UserRole.ADMIN]: '/dashboard/admin',
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.CUSTOMER,
      isActive: true,
    });

    return { data: sanitize(user), message: 'Registration successful' };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      data: {
        accessToken: token,
        user: sanitize(user),
        redirectTo: ROLE_REDIRECT[user.role],
      },
    };
  }
}

function sanitize(user: UserEntity) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}
