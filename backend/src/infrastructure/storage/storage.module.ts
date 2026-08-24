import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import { LocalStorageProvider } from './local-storage.provider';
import { STORAGE_PROVIDER } from './storage.provider';
import type { StorageProvider } from './storage.provider';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>): StorageProvider => {
        const driver = config.get('storage.driver', { infer: true });
        const root = config.get('storage.localRoot', { infer: true });

        switch (driver) {
          case 'local':
            return new LocalStorageProvider(root);
          default:
            throw new Error(`Unsupported storage driver: ${driver}`);
        }
      },
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
