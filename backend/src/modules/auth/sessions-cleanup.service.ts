import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { SessionRepository } from './repositories/session.repository';

const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const EXPIRED_GRACE_PERIOD_DAYS = 7;
const REVOKED_RETENTION_DAYS = 30;

@Injectable()
export class SessionsCleanupService {
  private readonly logger = new Logger(SessionsCleanupService.name);

  constructor(private readonly sessionRepository: SessionRepository) {}

  @Interval('sessions-cleanup', PURGE_INTERVAL_MS)
  async purge(): Promise<void> {
    const deleted = await this.sessionRepository.purgeStale(
      EXPIRED_GRACE_PERIOD_DAYS,
      REVOKED_RETENTION_DAYS,
    );

    if (deleted > 0) {
      this.logger.log(`Purged ${deleted} stale sessions`);
    }
  }
}
