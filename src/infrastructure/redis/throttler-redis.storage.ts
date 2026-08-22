import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

const KEY_PREFIX = 'jobpilot:throttle';

interface ThrottlerRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerRecord> {
    try {
      return await this.incrementInRedis(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      );
    } catch (err) {
      this.logger.error(
        `Throttle store unavailable, failing open for ${throttlerName}:${key}`,
        err instanceof Error ? err.message : String(err),
      );
      return {
        totalHits: 0,
        timeToExpire: 0,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }

  private async incrementInRedis(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerRecord> {
    const hitsKey = `${KEY_PREFIX}:${throttlerName}:${key}`;
    const blockKey = `${KEY_PREFIX}:block:${throttlerName}:${key}`;

    const blockTtlMs = await this.client.pttl(blockKey);
    if (blockTtlMs > 0) {
      return this.buildRecord(hitsKey, true, blockTtlMs);
    }

    const totalHits = Number(await this.client.incr(hitsKey));

    if (totalHits === 1) {
      await this.client.pexpire(hitsKey, ttl);
    }

    if (totalHits > limit) {
      await this.client.psetex(blockKey, blockDuration, 'blocked');
      return this.buildRecord(hitsKey, true, blockDuration);
    }

    return this.buildRecord(hitsKey, false, 0);
  }

  private async buildRecord(
    hitsKey: string,
    isBlocked: boolean,
    timeToBlockExpire: number,
  ): Promise<ThrottlerRecord> {
    const [totalHits, hitsTtlMs] = await Promise.all([
      this.client.get(hitsKey),
      this.client.pttl(hitsKey),
    ]);

    return {
      totalHits: Number(totalHits ?? 0),
      timeToExpire: this.msToSeconds(hitsTtlMs),
      isBlocked,
      timeToBlockExpire: this.msToSeconds(timeToBlockExpire),
    };
  }

  private msToSeconds(ms: number): number {
    return Math.max(1, Math.ceil(ms / 1000));
  }
}
