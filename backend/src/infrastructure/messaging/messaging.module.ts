import { Global, Logger, Module } from '@nestjs/common';
import * as amqp from 'amqplib';
import type { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/app-config.module';
import { RABBITMQ_CONNECTION } from './messaging.constants';
import { MessagingService } from './messaging.service';

@Global()
@Module({
  providers: [
    {
      provide: RABBITMQ_CONNECTION,
      inject: [APP_CONFIG],
      useFactory: async (config: AppConfig) => {
        const logger = new Logger('MessagingModule');
        const host = config.rabbitmq.host;
        const port = config.rabbitmq.port;
        const username = config.rabbitmq.username;
        const password = config.rabbitmq.password;
        const vhost = config.rabbitmq.vhost;

        const encodedUser = encodeURIComponent(username);
        const encodedPass = encodeURIComponent(password);
        // vhost is '/' or '/name' — ensure it starts with '/'
        const vhostPath = vhost.startsWith('/') ? vhost : `/${vhost}`;
        const url = `amqp://${encodedUser}:${encodedPass}@${host}:${port}${vhostPath}`;

        logger.log(`Connecting to RabbitMQ ${host}:${port}${vhostPath}`);

        const connection = await amqp.connect(url);

        // amqplib connection is EventEmitter
        const conn = connection as unknown as NodeJS.EventEmitter;
        conn.on('error', (err: Error) =>
          logger.error(`RabbitMQ error: ${err.message}`),
        );
        conn.on('close', () => logger.log('RabbitMQ connection closed'));
        conn.on('blocked', (reason: string) =>
          logger.warn(`RabbitMQ blocked: ${reason}`),
        );

        return connection;
      },
    },
    MessagingService,
  ],
  exports: [MessagingService, RABBITMQ_CONNECTION],
})
export class MessagingModule {}
