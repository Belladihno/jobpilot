import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppConfig } from '../../config/configuration';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const logger = new Logger('RedisModule');
        const host = config.get('redis.host', { infer: true });
        const port = config.get('redis.port', { infer: true });
        const password = config.get('redis.password', { infer: true });

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
