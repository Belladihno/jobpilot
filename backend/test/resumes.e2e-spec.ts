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

describe('Resumes upload (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let publishMock: jest.Mock;

  const PDF_MIME = 'application/pdf';

  beforeAll(async () => {
    const mockMessaging = {
      isHealthy: jest.fn().mockReturnValue(true),
      publish: jest.fn().mockReturnValue(true),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    };
    publishMock = mockMessaging.publish as unknown as jest.Mock;

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
      'TRUNCATE resumes, candidate_profiles, sessions, users CASCADE',
    );
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'resume@example.com',
        password: 'Password123',
        firstName: 'Re',
        lastName: 'Sumé',
      });
    cookie = (res.headers['set-cookie'] as unknown as string[])[0].split(
      ';',
    )[0];
    publishMock.mockClear();
  });

  it('uploads a pdf and returns uploaded resume', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Cookie', cookie)
      .attach('file', Buffer.from('%PDF-1.4 tiny'), {
        filename: 'cv.pdf',
        contentType: PDF_MIME,
      })
      .expect(201);

    expect(res.body.status).toBe('uploaded');
    expect(res.body.fileName).toBe('cv.pdf');
    expect(res.body.storageKey).toBeUndefined();
    expect(publishMock).toHaveBeenCalledWith(
      'jobpilot.events',
      'resume.processing.requested',
      expect.objectContaining({ resumeId: res.body.id }),
    );

    const list = await request(app.getHttpServer())
      .get('/api/resumes')
      .set('Cookie', cookie)
      .expect(200);
    expect(list.body).toHaveLength(1);
  });

  it('rejects unsupported file type', async () => {
    await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Cookie', cookie)
      .attach('file', Buffer.from('hello'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      })
      .expect(400);
    expect(publishMock).not.toHaveBeenCalled();
  });

  it('rejects when no file attached', async () => {
    await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Cookie', cookie)
      .expect(400);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/resumes').expect(401);
  });
});
