export interface AiCompletionClient {
  complete(systemPrompt: string, userPrompt: string): Promise<string>;
}

export const AI_COMPLETION_CLIENT = Symbol('AI_COMPLETION_CLIENT');
