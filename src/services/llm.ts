export type LLMService = {
  generateSummary(content: string): Promise<string>;
};

export function createLLMService(_apiKey: string): LLMService {
  return {
    // deno-lint-ignore require-await
    async generateSummary(_content: string): Promise<string> {
      return 'TODO: Implement OpenAI API call to generate summary';
    },
  };
}
