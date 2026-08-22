import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { REDIS_CLIENT } from '../src/infrastructure/redis/redis.constants';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { RABBITMQ_CONNECTION } from '../src/infrastructure/messaging/messaging.constants';
import { MessagingService } from '../src/infrastructure/messaging/messaging.service';
import { makeMockRedisClient } from './helpers/mock-redis-client';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  const mockRedis = {
    ping: jest.fn().mockResolvedValue('PONG'),
  } as unknown as RedisService;
  const mockMessaging = {
    isHealthy: jest.fn().mockReturnValue(true),
    publish: jest.fn(),
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
  } as unknown as MessagingService;
  const mockRedisClient = makeMockRedisClient();
  const mockRabbitConn = {
    createChannel: jest.fn().mockResolvedValue({
      publish: jest.fn().mockReturnValue(true),
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    }),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RedisService)
      .useValue(mockRedis)
      .overrideProvider(MessagingService)
      .useValue(mockMessaging)
      .overrideProvider(REDIS_CLIENT)
      .useValue(mockRedisClient)
      .overrideProvider(RABBITMQ_CONNECTION)
      .useValue(mockRabbitConn)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    if (dataSource) {
      await dataSource.query('TRUNCATE sessions, users CASCADE');
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  function extractCookie(res: request.Response): string {
    const setCookie = res.headers['set-cookie'] as unknown as
      string[] | string | undefined;
    if (!setCookie) return '';
    const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    return raw.split(';')[0];
  }

  it('POST /api/auth/register creates user and sets cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'e2e@example.com',
        password: 'Password123',
        firstName: 'E2E',
        lastName: 'User',
      })
      .expect(201);

    expect(res.body.email).toBe('e2e@example.com');
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('POST /api/auth/register duplicate 409', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'dup2@example.com',
        password: 'Password123',
        firstName: 'A',
        lastName: 'B',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'dup2@example.com',
        password: 'Password123',
        firstName: 'A',
        lastName: 'B',
      })
      .expect(409);
  });

  it('POST /api/auth/register invalid 400', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'not-an-email',
        password: 'short',
        firstName: '',
        lastName: '',
      })
      .expect(400);
  });

  it('POST /api/auth/login succeeds and 401 on bad password', async () => {
    await request(app.getHttpServer()).post('/api/auth/register').send({
      email: 'login@example.com',
      password: 'Password123',
      firstName: 'L',
      lastName: 'U',
    });

    const ok = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'Password123' })
      .expect(200);

    expect(ok.headers['set-cookie']).toBeDefined();

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'WrongPass' })
      .expect(401);
  });

  it('GET /api/auth/me 401 without cookie and 200 with cookie', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);

    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'me@example.com',
        password: 'Password123',
        firstName: 'Me',
        lastName: 'User',
      });
    const cookie = extractCookie(reg);

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(me.body.email).toBe('me@example.com');
  });

  it('POST /api/auth/logout revokes session', async () => {
    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'logout@example.com',
        password: 'Password123',
        firstName: 'Lo',
        lastName: 'Out',
      });
    const cookie = extractCookie(reg);

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', cookie)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
      .expect(401);
  });

  it('POST /api/auth/logout-all revokes all', async () => {
    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'logoutall@example.com',
        password: 'Password123',
        firstName: 'All',
        lastName: 'Out',
      });
    const cookie1 = extractCookie(reg);

    // second session via login
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'logoutall@example.com', password: 'Password123' });
    const cookie2 = extractCookie(login);

    await request(app.getHttpServer())
      .post('/api/auth/logout-all')
      .set('Cookie', cookie1)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie1)
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie2)
      .expect(401);
  });

  it('GET /api/health returns 200 with mocked infra', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.services.postgres).toBe('up');
    expect(res.body.services.redis).toBe('up');
    expect(res.body.services.rabbitmq).toBe('up');
  });
});
