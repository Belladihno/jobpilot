import { Inject, Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import type { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/app-config.module';

@Injectable()
export class TypeOrmConfig implements TypeOrmOptionsFactory {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      url: this.config.database.url,
      autoLoadEntities: true,
      synchronize: false,
      migrationsRun: false,
      logging: this.config.app.env === 'development',
      ssl: false,
    };
  }
}
