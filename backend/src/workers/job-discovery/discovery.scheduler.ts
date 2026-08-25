import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { MessagingService } from '../../infrastructure/messaging/messaging.service';
import {
  EXCHANGE_JOBPILOT_EVENTS,
  ROUTING_KEY_JOB_DISCOVERY_REQUESTED,
} from '../../infrastructure/messaging/topology';
import { JobSourceRegistry } from '../../infrastructure/job-sources/providers/registry';
import type { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/app-config.module';

const CRON_JOB_NAME = 'job-discovery';

@Injectable()
export class DiscoveryScheduler implements OnModuleInit {
  private readonly logger = new Logger(DiscoveryScheduler.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly messagingService: MessagingService,
    private readonly jobSourceRegistry: JobSourceRegistry,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  onModuleInit(): void {
    const job = new CronJob(this.config.discovery.cron, () =>
      this.publishDiscoveryRequests(),
    );
    this.schedulerRegistry.addCronJob(CRON_JOB_NAME, job);
    job.start();
    this.logger.log(
      `Discovery scheduler registered (${this.config.discovery.cron})`,
    );
  }

  /** Fan-out: one discovery request per enabled source. */
  publishDiscoveryRequests(): void {
    for (const adapter of this.jobSourceRegistry.getEnabled()) {
      try {
        this.messagingService.publish(
          EXCHANGE_JOBPILOT_EVENTS,
          ROUTING_KEY_JOB_DISCOVERY_REQUESTED,
          { source: adapter.id },
        );
      } catch (err) {
        this.logger.error(
          `Failed to publish discovery request for "${adapter.id}": ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}
