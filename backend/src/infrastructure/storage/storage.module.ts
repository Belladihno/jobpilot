import { Global, Module } from '@nestjs/common';
import type { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/app-config.module';
import { LocalStorageProvider } from './local-storage.provider';
import { STORAGE_PROVIDER } from './storage.provider';
import type { StorageProvider } from './storage.provider';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): StorageProvider => {
        const driver = config.storage.driver;
        const root = config.storage.localRoot;

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
