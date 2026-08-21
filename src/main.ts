import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as express from 'express';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import type { AppConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.use(cookieParser());

  const config = app.get(ConfigService<AppConfig, true>);
  const appUrl = config.get('app.url', { infer: true });
  const port = config.get('app.port', { infer: true });

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

  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`Server running on port ${port}`);
}
void bootstrap();
