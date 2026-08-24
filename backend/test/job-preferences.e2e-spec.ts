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

describe('Job preferences (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const mockMessaging = {
      isHealthy: jest.fn().mockReturnValue(true),
      publish: jest.fn().mockReturnValue(true),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    };

    await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RedisService)
      .useValue({ ping: jest.fn().mockResolvedValue('PONG') })
      .overrideProvider(MessagingService)
      .useValue(mockMessaging)
      .overrideProvider(REDIS_CLIENT)
      .useValue(makeMockRedisClient())
      .overrideProvider(RABBITMQ_CONNECTION)
      .useValue({
        createChannel: jest.fn().mockResolvedValue({
          publish: jest.fn().mockReturnValue(true),
          close: jest.fn().mockResolvedValue(undefined),
          on: jest.fn(),
          prefetch: jest.fn().mockResolvedValue(undefined),
          consume: jest.fn().mockResolvedValue({ consumerTag: 'mock' }),
          assertExchange: jest.fn().mockResolvedValue(undefined),
          assertQueue: jest.fn().mockResolvedValue({ queue: '' }),
          bindQueue: jest.fn().mockResolvedValue(undefined),
        }),
        close: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      })
      .compile()
      .then((moduleRef) => {
        app = moduleRef.createNestApplication();
        app.use(cookieParser());
        app.setGlobalPrefix('api');
        return app.init();
      });

    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  let cookie = '';

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE job_preferences, resumes, candidate_profiles, sessions, users CASCADE',
    );
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'prefs@example.com',
        password: 'Password123',
        firstName: 'Pre',
        lastName: 'Fs',
      });
    cookie = (res.headers['set-cookie'] as unknown as string[])[0].split(
      ';',
    )[0];
  });

  it('auto-creates preferences at registration with defaults', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/job-preferences')
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body.remotePreference).toBe('ANY');
    expect(res.body.jobTitles).toEqual([]);
    expect(res.body.minimumMatchScore).toBe(60);
    expect(res.body.autoApplyEnabled).toBe(false);
  });

  it('patches provided fields and leaves others untouched', async () => {
    const patched = await request(app.getHttpServer())
      .patch('/api/job-preferences')
      .set('Cookie', cookie)
      .send({
        jobTitles: ['Backend Engineer'],
        remotePreference: 'REMOTE',
        salaryCurrency: 'eur',
        minimumMatchScore: 80,
      })
      .expect(200);

    expect(patched.body.jobTitles).toEqual(['Backend Engineer']);
    expect(patched.body.remotePreference).toBe('REMOTE');
    expect(patched.body.salaryCurrency).toBe('EUR');
    expect(patched.body.minimumMatchScore).toBe(80);
    expect(patched.body.locations).toEqual([]);

    const reread = await request(app.getHttpServer())
      .get('/api/job-preferences')
      .set('Cookie', cookie)
      .expect(200);
    expect(reread.body.jobTitles).toEqual(['Backend Engineer']);
  });

  it('clears nullable fields via null and rejects invalid enums', async () => {
    await request(app.getHttpServer())
      .patch('/api/job-preferences')
      .set('Cookie', cookie)
      .send({ salaryMin: 70000, remotePreference: 'HYBRID' })
      .expect(200);

    const cleared = await request(app.getHttpServer())
      .patch('/api/job-preferences')
      .set('Cookie', cookie)
      .send({ salaryMin: null })
      .expect(200);
    expect(cleared.body.salaryMin).toBeNull();

    await request(app.getHttpServer())
      .patch('/api/job-preferences')
      .set('Cookie', cookie)
      .send({ remotePreference: 'TELEPORT' })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/api/job-preferences')
      .set('Cookie', cookie)
      .send({ minimumMatchScore: 101 })
      .expect(400);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/job-preferences').expect(401);
  });
});
