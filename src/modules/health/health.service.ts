import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { MessagingService } from '../../infrastructure/messaging/messaging.service';

export type HealthStatus = 'up' | 'down';

export interface HealthResult {
  status: 'ok' | 'error';
  timestamp: string;
  services: {
    api: HealthStatus;
    postgres: HealthStatus;
    redis: HealthStatus;
    rabbitmq: HealthStatus;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly messagingService: MessagingService,
  ) {}

  async check(): Promise<HealthResult> {
    let postgres: HealthStatus = 'down';
    let redis: HealthStatus = 'down';
    let rabbitmq: HealthStatus = 'down';

    try {
      await this.dataSource.query('SELECT 1');
      postgres = 'up';
    } catch (err) {
      this.logger.error('Postgres health check failed', err as string);
    }

    try {
      const pong = await this.redisService.ping();
      redis = pong === 'PONG' ? 'up' : 'down';
    } catch (err) {
      this.logger.error('Redis health check failed', err as string);
    }

    try {
      rabbitmq = this.messagingService.isHealthy() ? 'up' : 'down';
    } catch (err) {
      this.logger.error('RabbitMQ health check failed', err as string);
    }

    const allUp = postgres === 'up' && redis === 'up' && rabbitmq === 'up';

    return {
      status: allUp ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        api: 'up',
        postgres,
        redis,
        rabbitmq,
      },
    };
  }
}
