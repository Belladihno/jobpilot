import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { AppConfig } from '../../config/configuration';
import { UsersService } from '../users/users.service';
import { UserStatus } from '../users/entities/user.entity';
import { SessionRepository } from './repositories/session.repository';
import { PasswordService } from './password.service';
import { RegisterDto } from './schemas/register.schema';
import { LoginDto } from './schemas/login.schema';
import { SessionEntity } from './entities/session.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionRepository: SessionRepository,
    private readonly passwordService: PasswordService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async register(dto: RegisterDto, meta: { ip: string; userAgent: string }) {
    const exists = await this.usersService.existsByEmail(dto.email);
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    const { token, session } = await this.createSession(user.id, meta);

    return { user, token, session };
  }

  async login(dto: LoginDto, meta: { ip: string; userAgent: string }) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await this.passwordService.verify(
      user.passwordHash,
      dto.password,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (
      user.status !== UserStatus.ACTIVE &&
      user.status !== UserStatus.PENDING_VERIFICATION
    ) {
      throw new UnauthorizedException('Account is not active');
    }

    const { token, session } = await this.createSession(user.id, meta);

    return { user, token, session };
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionRepository.revokeById(sessionId);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionRepository.revokeAllByUserId(userId);
  }

  async validateSession(token: string): Promise<SessionEntity | null> {
    const tokenHash = this.hashToken(token);
    const session = await this.sessionRepository.findByTokenHash(tokenHash);

    if (!session) return null;
    if (session.revokedAt) return null;
    if (session.expiresAt < new Date()) return null;

    await this.sessionRepository.updateLastUsed(session.id);

    return session;
  }

  private async createSession(
    userId: string,
    meta: { ip: string; userAgent: string },
  ) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const ttl = this.config.get('auth.sessionTtlSeconds', { infer: true });

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + ttl);

    const session = await this.sessionRepository.create({
      userId,
      tokenHash,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      expiresAt,
    });

    return { token, session };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
