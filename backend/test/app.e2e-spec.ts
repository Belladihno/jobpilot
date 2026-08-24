import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module';
import { REDIS_CLIENT } from '../src/infrastructure/redis/redis.constants';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { RABBITMQ_CONNECTION } from '../src/infrastructure/messaging/messaging.constants';
import { MessagingService } from '../src/infrastructure/messaging/messaging.service';
import { makeMockRedisClient } from './helpers/mock-redis-client';

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
    const mockRedisClient = makeMockRedisClient();
    const mockRabbitConn = {
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
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(mockRedis)
      .overrideProvider(MessagingService)
      .useValue(mockMessaging)
      .overrideProvider(REDIS_CLIENT)
      .useValue(mockRedisClient)
      .overrideProvider(RABBITMQ_CONNECTION)
      .useValue(mockRabbitConn)
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
    if (app) {
      await app.close();
    }
  });
});
