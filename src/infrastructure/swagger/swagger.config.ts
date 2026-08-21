import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('JobPilot API')
    .setDescription('JobPilot Phase 1 — Auth, Users, Health')
    .setVersion('1.0.0')
    .addCookieAuth('jobpilot_session', {
      type: 'apiKey',
      in: 'cookie',
      name: 'jobpilot_session',
    })
    .addApiKey(
      { type: 'apiKey', name: 'x-correlation-id', in: 'header' },
      'correlation-id',
    )
    .addTag('auth', 'Authentication & sessions')
    .addTag('health', 'Infrastructure health')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  });

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'JobPilot Docs',
  });
}
