import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import { AI_COMPLETION_CLIENT } from './ai-client.interface';
import type { AiCompletionClient } from './ai-client.interface';
import { AnthropicAiClient } from './providers/anthropic-ai.client';
import { StubAiClient } from './providers/stub-ai.client';

@Module({
  providers: [
    {
      provide: AI_COMPLETION_CLIENT,
      inject: [ConfigService],
      useFactory: (
        config: ConfigService<AppConfig, true>,
      ): AiCompletionClient => {
        const provider = config.get('ai.provider', { infer: true });

        switch (provider) {
          case 'anthropic': {
            const apiKey = config.get('ai.anthropicApiKey', { infer: true });
            if (!apiKey) {
              throw new Error(
                'AI_PROVIDER=anthropic requires AI_ANTHROPIC_API_KEY',
              );
            }
            const model = config.get('ai.anthropicModel', { infer: true });
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
