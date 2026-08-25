import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DataSource, QueryFailedError } from 'typeorm';
import type { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/app-config.module';
import { UsersService } from '../users/users.service';
import { UserEntity, UserStatus } from '../users/entities/user.entity';
import { CandidateProfileEntity } from '../candidate/entities/candidate-profile.entity';
import { JobPreferencesEntity } from '../job-preferences/entities/job-preferences.entity';
import { SessionRepository } from './repositories/session.repository';
import { PasswordService } from './password.service';
import { RegisterDto } from './schemas/register.schema';
import { LoginDto } from './schemas/login.schema';
import { SessionEntity } from './entities/session.entity';

const LAST_USED_UPDATE_INTERVAL_MS = 60_000;

@Injectable()
export class AuthService {
  private dummyHashPromise?: Promise<string>;

  constructor(
    private readonly usersService: UsersService,
    private readonly sessionRepository: SessionRepository,
    private readonly passwordService: PasswordService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto, meta: { ip: string; userAgent: string }) {
    const exists = await this.usersService.existsByEmail(dto.email);
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    let user;
    try {
      user = await this.createUserWithProfile({
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      });
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('Email already registered');
      }
      throw err;
    }

    const { token, session } = await this.createSession(user.id, meta);

    return { user, token, session };
  }

  async login(dto: LoginDto, meta: { ip: string; userAgent: string }) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      await this.verifyDummyHash(dto.password);
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

    const lastUsed = session.lastUsedAt?.getTime() ?? 0;
    if (Date.now() - lastUsed > LAST_USED_UPDATE_INTERVAL_MS) {
      await this.sessionRepository.updateLastUsed(session.id);
    }

    return session;
  }

  private createUserWithProfile(
    data: Pick<UserEntity, 'email' | 'passwordHash' | 'firstName' | 'lastName'>,
  ): Promise<UserEntity> {
    return this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(UserEntity);
      const profileRepository = manager.getRepository(CandidateProfileEntity);
      const preferencesRepository = manager.getRepository(JobPreferencesEntity);

      const user = await userRepository.save(userRepository.create(data));
      await profileRepository.save(
        profileRepository.create({ userId: user.id }),
      );
      await preferencesRepository.save(
        preferencesRepository.create({ userId: user.id }),
      );

      return user;
    });
  }

  private isUniqueViolation(err: unknown): boolean {
    if (!(err instanceof QueryFailedError)) {
      return false;
    }
    const withCode = err as unknown as {
      code?: string;
      driverError?: { code?: string };
    };
    return withCode.code === '23505' || withCode.driverError?.code === '23505';
  }

  private async verifyDummyHash(password: string): Promise<void> {
    this.dummyHashPromise ??= this.passwordService.hash(
      'timing-equalizer-not-a-real-password',
    );
    const dummyHash = await this.dummyHashPromise;
    await this.passwordService.verify(dummyHash, password);
  }

  private async createSession(
    userId: string,
    meta: { ip: string; userAgent: string },
  ) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const ttl = this.config.auth.sessionTtlSeconds;

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
