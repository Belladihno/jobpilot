import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { AppConfig } from '../../config/configuration';
import { RABBITMQ_CONNECTION } from './messaging.constants';
import { MessagingService } from './messaging.service';

@Global()
@Module({
  providers: [
    {
      provide: RABBITMQ_CONNECTION,
      inject: [ConfigService],
      useFactory: async (config: ConfigService<AppConfig, true>) => {
        const logger = new Logger('MessagingModule');
        const host = config.get('rabbitmq.host', { infer: true });
        const port = config.get('rabbitmq.port', { infer: true });
        const username = config.get('rabbitmq.username', { infer: true });
        const password = config.get('rabbitmq.password', { infer: true });
        const vhost = config.get('rabbitmq.vhost', { infer: true });

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
