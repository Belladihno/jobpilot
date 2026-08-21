import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { MessagingService } from '../src/infrastructure/messaging/messaging.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const mockRedis = {
      ping: jest.fn().mockResolvedValue('PONG'),
    } as unknown as RedisService;
    const mockMessaging = {
      isHealthy: jest.fn().mockReturnValue(true),
      publish: jest.fn(),
    } as unknown as MessagingService;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(mockRedis)
      .overrideProvider(MessagingService)
      .useValue(mockMessaging)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    (
      app as unknown as { setGlobalPrefix: (p: string) => void }
    ).setGlobalPrefix('api');
    await app.init();
  });

  it('/ (GET) health', () => {
    return request(app.getHttpServer()).get('/api/health').expect(200);
  });

  afterEach(async () => {
    await app.close();
  });
});
