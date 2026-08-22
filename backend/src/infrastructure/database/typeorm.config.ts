import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { AppConfig } from '../../config/configuration';

@Injectable()
export class TypeOrmConfig implements TypeOrmOptionsFactory {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      url: this.config.get('database.url', { infer: true }),
      autoLoadEntities: true,
      synchronize: false,
      migrations: [__dirname + '/../../../migrations/*{.ts,.js}'],
      migrationsRun: false,
      logging: this.config.get('app.env', { infer: true }) === 'development',
      ssl: false,
    };
  }
}
