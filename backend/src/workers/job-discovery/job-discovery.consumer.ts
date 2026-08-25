import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import type { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { RABBITMQ_CONNECTION } from '../../infrastructure/messaging/messaging.constants';
import { QUEUE_JOB_DISCOVERY } from '../../infrastructure/messaging/topology';
import { JobSourceRegistry } from '../../infrastructure/job-sources/providers/registry';
import { JobDiscoveryMessageSchema } from '../../modules/jobs/schemas/job-discovery-message.schema';
import { JobsRepository } from '../../modules/jobs/repositories/jobs.repository';

@Injectable()
export class JobDiscoveryConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(JobDiscoveryConsumer.name);
  private channel: Channel | null = null;

  constructor(
    @Inject(RABBITMQ_CONNECTION) private readonly connection: ChannelModel,
    private readonly jobSourceRegistry: JobSourceRegistry,
    private readonly jobsRepository: JobsRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.start();
  }

  async start(): Promise<void> {
    this.channel = await this.connection.createChannel();
    await this.channel.prefetch(1);
    await this.channel.consume(
      QUEUE_JOB_DISCOVERY,
      (message) => void this.handle(message),
    );
    this.logger.log('Job discovery consumer started');
  }

  async handle(message: ConsumeMessage | null): Promise<void> {
    if (!this.channel || !message) return;

    const parsed = JobDiscoveryMessageSchema.safeParse(this.parseJson(message));
    if (!parsed.success) {
      this.logger.warn('Discarding malformed discovery message');
      this.channel.ack(message);
      return;
    }

    const { source } = parsed.data;
    const adapter = this.jobSourceRegistry.get(source);
    if (!adapter) {
      this.logger.warn(`Unknown job source "${source}", discarding`);
      this.channel.ack(message);
      return;
    }

    try {
      const jobs = await adapter.fetchLatest();
      const result = await this.jobsRepository.upsertMany(jobs);

      // TODO(Batch E): trigger matching pass over
      // [...result.insertedIds, ...result.updatedIds]

      this.logger.log(
        `Discovery from "${source}": fetched ${jobs.length}, inserted ${result.insertedIds.length}, updated ${result.updatedIds.length}, unchanged ${result.unchangedCount}`,
      );
    } catch (err) {
      // Source failures are transient by nature; drop the message instead of
      // requeueing — the next cron tick will retry discovery anyway.
      this.logger.error(
        `Discovery from "${source}" failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    this.channel.ack(message);
  }

  private parseJson(message: ConsumeMessage): unknown {
    try {
      return JSON.parse(message.content.toString());
    } catch {
      return null;
    }
  }
}
