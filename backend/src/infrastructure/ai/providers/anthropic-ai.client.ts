import { Injectable, Logger } from '@nestjs/common';
import type { AiCompletionClient } from '../ai-client.interface';

interface AnthropicMessage {
  type: string;
  text?: string;
}

interface AnthropicLike {
  messages: {
    create(args: {
      model: string;
      max_tokens: number;
      system: string;
      messages: Array<{ role: 'user'; content: string }>;
    }): Promise<{ content: AnthropicMessage[] }>;
  };
}

@Injectable()
export class AnthropicAiClient implements AiCompletionClient {
  private readonly logger = new Logger(AnthropicAiClient.name);
  private client: AnthropicLike | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const client = await this.getClient();
    const response = await client.messages.create({
      model: this.model,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content
      .filter(
        (block) => block.type === 'text' && typeof block.text === 'string',
      )
      .map((block) => block.text as string)
      .join('');

    if (!text) {
      throw new Error('Anthropic returned no text content');
    }
    return text;
  }

  private async getClient(): Promise<AnthropicLike> {
    if (this.client) return this.client;

    // Lazy dynamic import so the SDK stays optional until
    // AI_PROVIDER=anthropic is actually selected.
    const moduleName = '@anthropic-ai/sdk';
    const mod = (await import(moduleName)) as {
      default: new (options: { apiKey: string }) => AnthropicLike;
    };
    this.client = new mod.default({ apiKey: this.apiKey });
    this.logger.log(`Anthropic client ready (model ${this.model})`);
    return this.client;
  }
}
