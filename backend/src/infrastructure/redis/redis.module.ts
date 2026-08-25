import { Global, Logger, Module } from '@nestjs/common';
import Redis from 'ioredis';
import type { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/app-config.module';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => {
        const logger = new Logger('RedisModule');
        const host = config.redis.host;
        const port = config.redis.port;
        const password = config.redis.password;

        const client = new Redis({
          host,
          port,
          password: password || undefined,
          lazyConnect: false,
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
        });

        client.on('connect', () =>
          logger.log(`Redis connecting ${host}:${port}`),
        );
        client.on('ready', () => logger.log(`Redis ready ${host}:${port}`));
        client.on('error', (err) =>
          logger.error(`Redis error: ${err.message}`),
        );
        client.on('close', () => logger.log('Redis connection closed'));

        return client;
      },
    },
    RedisService,
  ],
  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule {}
