import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as express from 'express';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { setupSwagger } from './infrastructure/swagger/swagger.config';
import type { AppConfig } from './config/configuration';
import { APP_CONFIG } from './config/app-config.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.use(cookieParser());

  const config = app.get<AppConfig>(APP_CONFIG);
  const appUrl = config.app.url;
  const port = config.app.port;
  const env = config.app.env;
  const workerStandalone = config.worker.standalone;

  if (workerStandalone) {
    // Consumer-only mode: no HTTP listener, the queue is the interface.
    await app.init();
    new Logger('Bootstrap').log('Worker standalone mode — HTTP disabled');
    return;
  }

  app.enableCors({
    origin: appUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
  });

  app.use(express.json({ limit: '1mb' }));

  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.setGlobalPrefix('api');

  app.useGlobalFilters(new GlobalExceptionFilter());

  if (env !== 'production') {
    setupSwagger(app);
  }

  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`Server running on port ${port}`);
  if (env !== 'production') {
    logger.log(`Swagger docs available at ${appUrl}/api/docs`);
  }
}
void bootstrap();
