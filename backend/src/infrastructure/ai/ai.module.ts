import { Module } from '@nestjs/common';
import type { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/app-config.module';
import { AI_COMPLETION_CLIENT } from './ai-client.interface';
import type { AiCompletionClient } from './ai-client.interface';
import { AnthropicAiClient } from './providers/anthropic-ai.client';
import { StubAiClient } from './providers/stub-ai.client';

@Module({
  providers: [
    {
      provide: AI_COMPLETION_CLIENT,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): AiCompletionClient => {
        const provider = config.ai.provider;

        switch (provider) {
          case 'anthropic': {
            const apiKey = config.ai.anthropicApiKey;
            if (!apiKey) {
              throw new Error(
                'AI_PROVIDER=anthropic requires AI_ANTHROPIC_API_KEY',
              );
            }
            const model = config.ai.anthropicModel;
            return new AnthropicAiClient(apiKey, model);
          }
          case 'stub':
            return new StubAiClient();
          default:
            throw new Error(`Unsupported AI provider: ${provider}`);
        }
      },
    },
  ],
  exports: [AI_COMPLETION_CLIENT],
})
export class AiModule {}
