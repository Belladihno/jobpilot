import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import type { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { RABBITMQ_CONNECTION } from '../../infrastructure/messaging/messaging.constants';
import { QUEUE_RESUME_PROCESSING } from '../../infrastructure/messaging/topology';
import { StorageProvider } from '../../infrastructure/storage/storage.provider';
import { ResumeRepository } from '../../modules/resumes/repositories/resume.repository';
import { ResumeProcessingMessageSchema } from '../../modules/resumes/schemas/resume-message.schema';
import { ResumeParserRegistry } from './resume-parser.registry';
import { ResumeStatus } from '../../modules/resumes/entities/resume.entity';

@Injectable()
export class ResumeProcessingConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(ResumeProcessingConsumer.name);
  private channel: Channel | null = null;

  constructor(
    @Inject(RABBITMQ_CONNECTION) private readonly connection: ChannelModel,
    private readonly resumeRepository: ResumeRepository,
    private readonly parserRegistry: ResumeParserRegistry,
    private readonly storageProvider: StorageProvider,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.start();
  }
  async start(): Promise<void> {
    this.channel = await this.connection.createChannel();
    await this.channel.prefetch(1);
    await this.channel.consume(
      QUEUE_RESUME_PROCESSING,
      (message) => void this.handle(message),
    );
    this.logger.log('Resume processing consumer started');
  }

  async handle(message: ConsumeMessage | null): Promise<void> {
    if (!this.channel || !message) return;

    const parsed = ResumeProcessingMessageSchema.safeParse(
      this.parseJson(message),
    );
    if (!parsed.success) {
      this.logger.warn('Discarding malformed resume message');
      this.channel.ack(message);
      return;
    }

    const { resumeId } = parsed.data;
    const resume = await this.resumeRepository.findById(resumeId);
    if (!resume) {
      this.logger.warn(`Resume ${resumeId} not found, discarding`);
      this.channel.ack(message);
      return;
    }

    try {
      resume.status = ResumeStatus.PROCESSING;
      await this.resumeRepository.save(resume);

      const file = await this.storageProvider.get(resume.storageKey);
      const parser = this.parserRegistry.find(resume.mimeType);
      if (!parser) {
        throw new Error(`No parser for mime ${resume.mimeType}`);
      }

      resume.extractedText = await parser.extract(file);

      // Batch D inserts the AI structuring stage between extraction
      // and the processed status.
      resume.status = ResumeStatus.PROCESSED;
      resume.processingError = null;
      await this.resumeRepository.save(resume);
      this.logger.log(`Resume ${resumeId} processed`);
    } catch (err) {
      resume.status = ResumeStatus.FAILED;
      resume.processingError = err instanceof Error ? err.message : String(err);
      await this.resumeRepository.save(resume).catch(() => undefined);
      this.logger.error(`Resume ${resumeId} failed: ${resume.processingError}`);
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
