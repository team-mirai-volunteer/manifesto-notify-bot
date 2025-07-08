/**
 * LLMサービスのインターフェース
 */
export type LLMService = {
  /**
   * マニフェストの要約を生成する
   * @param content マニフェストの内容
   * @returns 生成された要約
   */
  generateSummary(content: string): Promise<string>;
};

/**
 * LLMサービスを作成する
 * @param apiKey OpenAI APIキー
 * @returns LLMService
 */
export function createLLMService(_apiKey: string): LLMService {
  return {
    // deno-lint-ignore require-await
    async generateSummary(_content: string): Promise<string> {
      return "TODO: Implement OpenAI API call to generate summary";
    },
  };
}
