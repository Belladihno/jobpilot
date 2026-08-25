import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configuration } from './configuration';
import type { AppConfig } from './configuration';

/**
 * Fully-typed access to the validated application config.
 *
 * Prefer injecting APP_CONFIG over ConfigService string-paths:
 * property access is compile-checked, and array-valued leaves are typed
 * correctly (ConfigService's { infer: true } degrades arrays to `any`).
 */
export const APP_CONFIG = Symbol('APP_CONFIG');

@Global()
@Module({
  providers: [
    {
      // Depending on ConfigService guarantees dotenv + Joi validation have run.
      provide: APP_CONFIG,
      inject: [ConfigService],
      useFactory: (): AppConfig => configuration(),
    },
  ],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
