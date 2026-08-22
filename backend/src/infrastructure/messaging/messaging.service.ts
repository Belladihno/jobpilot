import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { Channel, ChannelModel } from 'amqplib';
import { RABBITMQ_CONNECTION } from './messaging.constants';

@Injectable()
export class MessagingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagingService.name);
  private channel: Channel | null = null;

  constructor(
    @Inject(RABBITMQ_CONNECTION) private readonly connection: ChannelModel,
  ) {}

  async onModuleInit(): Promise<void> {
    this.channel = await this.connection.createChannel();
    this.logger.log('RabbitMQ channel created');
  }

  publish(exchange: string, routingKey: string, payload: unknown): boolean {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    const buffer = Buffer.from(JSON.stringify(payload));
    return this.channel.publish(exchange, routingKey, buffer, {
      persistent: true,
      contentType: 'application/json',
    });
  }

  isHealthy(): boolean {
    // amqplib Connection has no explicit isConnected, check channel + connection
    return (
      !!this.channel &&
      !!(this.connection as unknown as { connection?: unknown })
    );
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.logger.log('RabbitMQ channel closed');
      }
    } catch (err) {
      this.logger.error('Error closing RabbitMQ channel', err as string);
    }
    try {
      await this.connection.close();
      this.logger.log('RabbitMQ connection closed');
    } catch (err) {
      this.logger.error('Error closing RabbitMQ connection', err as string);
    }
  }
}
