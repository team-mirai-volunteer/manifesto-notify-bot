import { config } from '../config.ts';

export type LLMService = {
  generateSummary(content: string): Promise<string>;
};

export function createLLMService(): LLMService {
  if (config.isProd()) {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    // TODO: Implement OpenAI API client initialization
    return {
      // deno-lint-ignore require-await
      async generateSummary(_content: string): Promise<string> {
        return 'TODO: Implement OpenAI API call to generate summary';
      },
    };
  }

  return {
    // deno-lint-ignore require-await
    async generateSummary(_content: string): Promise<string> {
      return 'TODO: Implement OpenAI API call to generate summary';
    },
  };
}
