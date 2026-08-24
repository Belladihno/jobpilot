import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './infrastructure/database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { MessagingModule } from './infrastructure/messaging/messaging.module';
import { HealthModule } from './modules/health/health.module';
import { CandidateModule } from './modules/candidate/candidate.module';
import { ResumesModule } from './modules/resumes/resumes.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import {
  ThrottlerModule,
  ThrottlerGuard,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { StorageModule } from './infrastructure/storage/storage.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { AuthenticationGuard } from './common/guards/authentication.guard';
import { ZodEnforcementInterceptor } from './common/interceptors/zod-enforcement.interceptor';
import { RedisThrottlerStorage } from './infrastructure/redis/throttler-redis.storage';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    DatabaseModule,
    RedisModule,
    MessagingModule,
    StorageModule,
    ScheduleModule.forRoot(),
    HealthModule,
    CandidateModule,
    ResumesModule,
    UsersModule,
    AuthModule,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 10,
      },
      {
        name: 'long',
        ttl: 3600000,
        limit: 100,
      },
    ]),
  ],
  providers: [
    {
      provide: ThrottlerStorage,
      useClass: RedisThrottlerStorage,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodEnforcementInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('/{*path}');
  }
}
