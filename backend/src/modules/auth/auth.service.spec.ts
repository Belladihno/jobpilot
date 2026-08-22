import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { QueryFailedError } from 'typeorm';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { SessionRepository } from './repositories/session.repository';
import { PasswordService } from './password.service';
import { UserStatus } from '../users/entities/user.entity';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let sessionRepo: jest.Mocked<SessionRepository>;
  let passwordService: jest.Mocked<PasswordService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'hashed',
    firstName: 'John',
    lastName: 'Doe',
    status: UserStatus.ACTIVE,
  } as unknown as import('../users/entities/user.entity').UserEntity;

  beforeEach(() => {
    usersService = {
      existsByEmail: jest.fn(),
      create: jest.fn(),
      findByEmail: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    sessionRepo = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      revokeById: jest.fn(),
      revokeAllByUserId: jest.fn(),
      updateLastUsed: jest.fn(),
    } as unknown as jest.Mocked<SessionRepository>;

    passwordService = {
      hash: jest.fn(),
      verify: jest.fn(),
    } as unknown as jest.Mocked<PasswordService>;

    configService = {
      get: jest.fn().mockReturnValue(604800),
    } as unknown as jest.Mocked<ConfigService>;

    authService = new AuthService(
      usersService,
      sessionRepo,
      passwordService,
      configService as never,
    );
  });

  describe('register', () => {
    it('creates user and session', async () => {
      usersService.existsByEmail.mockResolvedValue(false);
      passwordService.hash.mockResolvedValue('hashed-pass');
      usersService.create.mockResolvedValue(mockUser);
      sessionRepo.create.mockResolvedValue({ id: 'sess-1' } as never);

      const result = await authService.register(
        {
          email: 'user@example.com',
          password: 'pass12345',
          firstName: 'John',
          lastName: 'Doe',
        },
        { ip: '127.0.0.1', userAgent: 'jest' },
      );

      expect(result.user).toBe(mockUser);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(passwordService.hash).toHaveBeenCalledWith('pass12345');
    });

    it('throws Conflict if email exists', async () => {
      usersService.existsByEmail.mockResolvedValue(true);
      await expect(
        authService.register(
          {
            email: 'dup@example.com',
            password: 'pass12345',
            firstName: 'A',
            lastName: 'B',
          },
          { ip: '', userAgent: '' },
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('maps unique violation on insert to conflict when race passes pre-check', async () => {
      usersService.existsByEmail.mockResolvedValue(false);
      passwordService.hash.mockResolvedValue('hashed-pass');
      const dupError = new QueryFailedError(
        'insert into users...',
        [],
        Object.assign(new Error('duplicate key'), { code: '23505' }),
      );
      usersService.create.mockRejectedValue(dupError);

      await expect(
        authService.register(
          {
            email: 'race@example.com',
            password: 'pass12345',
            firstName: 'R',
            lastName: 'C',
          },
          { ip: '', userAgent: '' },
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('succeeds with valid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      passwordService.verify.mockResolvedValue(true);
      sessionRepo.create.mockResolvedValue({ id: 'sess-1' } as never);

      const res = await authService.login(
        { email: 'user@example.com', password: 'pass12345' },
        { ip: '', userAgent: '' },
      );
      expect(res.user).toBe(mockUser);
      expect(res.token).toBeDefined();
    });

    it('fails with generic error if user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      passwordService.hash.mockResolvedValue('dummy-hash');
      await expect(
        authService.login(
          { email: 'missing@example.com', password: 'x' },
          { ip: '', userAgent: '' },
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('runs dummy hash verify on unknown email to equalize timing', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      passwordService.hash.mockResolvedValue('dummy-hash');
      passwordService.verify.mockResolvedValue(false);

      await expect(
        authService.login(
          { email: 'unknown@example.com', password: 'guess' },
          { ip: '', userAgent: '' },
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(passwordService.verify).toHaveBeenCalledWith(
        'dummy-hash',
        'guess',
      );
    });

    it('fails with generic error if password wrong', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      passwordService.verify.mockResolvedValue(false);
      await expect(
        authService.login(
          { email: 'user@example.com', password: 'wrong' },
          { ip: '', userAgent: '' },
        ),
      ).rejects.toThrow('Invalid credentials');
    });

    it('rejects suspended user', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      } as unknown as import('../users/entities/user.entity').UserEntity);
      passwordService.verify.mockResolvedValue(true);
      await expect(
        authService.login(
          { email: 'user@example.com', password: 'pass' },
          { ip: '', userAgent: '' },
        ),
      ).rejects.toThrow('Account is not active');
    });

    it('allows pending_verification user', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        status: UserStatus.PENDING_VERIFICATION,
      } as unknown as import('../users/entities/user.entity').UserEntity);
      passwordService.verify.mockResolvedValue(true);
      sessionRepo.create.mockResolvedValue({ id: 'sess-1' } as never);

      const res = await authService.login(
        { email: 'user@example.com', password: 'pass' },
        { ip: '', userAgent: '' },
      );
      expect(res.token).toBeDefined();
    });
  });

  describe('validateSession', () => {
    it('returns session if valid', async () => {
      const token = 'tok';
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      const session = {
        id: 's1',
        tokenHash: hash,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 10000),
      } as never;
      sessionRepo.findByTokenHash.mockResolvedValue(session);

      const result = await authService.validateSession(token);
      expect(result).toBe(session);
      expect(sessionRepo.updateLastUsed).toHaveBeenCalledWith('s1');
    });

    it('returns null if revoked', async () => {
      const token = 'tok2';
      sessionRepo.findByTokenHash.mockResolvedValue({
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      } as never);
      expect(await authService.validateSession(token)).toBeNull();
    });

    it('returns null if expired', async () => {
      const token = 'tok3';
      sessionRepo.findByTokenHash.mockResolvedValue({
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      } as never);
      expect(await authService.validateSession(token)).toBeNull();
    });

    it('returns null if not found', async () => {
      sessionRepo.findByTokenHash.mockResolvedValue(null);
      expect(await authService.validateSession('missing')).toBeNull();
    });
  });

  describe('logout', () => {
    it('revokes session', async () => {
      await authService.logout('sess-1');
      expect(sessionRepo.revokeById).toHaveBeenCalledWith('sess-1');
    });

    it('revokes all sessions', async () => {
      await authService.logoutAll('user-1');
      expect(sessionRepo.revokeAllByUserId).toHaveBeenCalledWith('user-1');
    });
  });
});
