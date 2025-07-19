import OpenAI from '@openai/openai';
import { delay } from '@std/async';
import { PullRequestInfo } from './github.ts';

const INSTRUCTIONS = `
  あなたは政策マニフェスト更新の要約を作成するエキスパートです。

  【政策の定義】
  政策とは、以下のいずれかに該当する内容を指します：
  1. 具体的な施策・制度の新設、変更、廃止
  2. 予算配分、補助金、給付金に関する内容
  3. 法令・規制の制定、改正、撤廃
  4. 公共サービスの提供方法や対象の変更
  5. 数値目標（期限、割合、金額等）の設定や変更
  6. 政府・行政の取り組み方針の変更

  【政策変更ではないもの】
  以下は政策変更とみなしません：
  - 誤字脱字の修正（typo修正）
  - 文章の言い回しの変更（意味が変わらない場合）
  - フォーマットや体裁の調整
  - 参照リンクの更新
  - メタデータの更新
  - 既存政策の説明の補足（新たな施策を含まない場合）

  役割：
  - GitHubのPR情報から、市民に分かりやすい日本語の要約を作成
  - 政策の変更内容を端的に伝える
  - SNS（X）での拡散を意識した興味を引く文章を作成

  制約：
  - 必ず100文字以内（句読点・記号含む）
  - 専門用語は避け、一般市民にも理解できる表現を使用
  - 絵文字は使用しない
  - 重要な変更点を優先的に記載
  - 「です・ます」調で統一
  - **政策の変更ではない場合は、「要約対象外」のみ記載**

  出力形式：
  単一の要約文のみを出力。説明や補足は一切含めない。
`;

export type LLMService = {
  generateSummary(pr: PullRequestInfo): Promise<string>;
};

// OpenAI APIのレスポンス型
export type OpenAIResponse = {
  choices: Array<{
    message: {
      content: string | null;
    };
  }>;
};

// OpenAI APIを呼び出す関数の型
// 実際のOpenAI SDKではなく、テスト用の簡略化されたインターフェース
export interface OpenAIClient {
  chat: {
    completions: {
      create(params: {
        model: string;
        messages: Array<{ role: string; content: string }>;
      }): Promise<OpenAIResponse>;
    };
  };
}

// リトライ可能かどうかを判定する関数
export function isRetryableError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    // リトライ可能なステータスコード（403を追加）
    const retryableStatuses = [403, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(status);
  }
  return false;
}

// リトライオプションの型定義
export type RetryOptions = {
  maxAttempts?: number;
  minTimeout?: number;
  maxTimeout?: number;
  multiplier?: number;
  jitter?: number;
};

// OpenAI APIを呼び出してコンテンツを取得する関数
export async function callOpenAIWithRetry<T extends OpenAIClient>(
  openai: T,
  messages: Array<{ role: string; content: string }>,
  model: string,
  retryOptions: RetryOptions,
): Promise<string> {
  const maxAttempts = retryOptions.maxAttempts || 3;
  const minTimeout = retryOptions.minTimeout || 1000;
  const maxTimeout = retryOptions.maxTimeout || 4000;
  const multiplier = retryOptions.multiplier || 2;
  const jitter = retryOptions.jitter || 1;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const resp = await openai.chat.completions.create({
        model,
        messages,
      });

      const content = resp.choices.shift()?.message.content;
      if (!content) {
        console.warn('No choices returned from OpenAI API');
        throw new Error('No content in OpenAI response');
      }

      return content;
    } catch (error) {
      lastError = error;

      // エラーログを出力
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: number }).status;
        console.error(`OpenAI API error - Status: ${status}`, error);

        // リトライ不可能なエラーは詳細をログに記録
        if (status === 401) {
          console.error('OpenAI API authentication failed (401) - check API key');
        }
      }

      // リトライ不可能なエラーの場合は即座に失敗
      if (!isRetryableError(error)) {
        throw error;
      }

      // 最後の試行の場合はリトライしない
      if (attempt === maxAttempts - 1) {
        break;
      }

      // リトライ間隔の計算
      let timeout = Math.min(minTimeout * Math.pow(multiplier, attempt), maxTimeout);
      if (jitter) {
        timeout = timeout * (0.5 + Math.random() * jitter);
      }

      await delay(timeout);
    }
  }

  // すべてのリトライが失敗した場合
  throw lastError;
}

export function createLLMService(isProd: boolean): LLMService {
  if (isProd) {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });

    return {
      async generateSummary(pr: PullRequestInfo): Promise<string> {
        console.log('Summarizing PR:', pr.title);

        const input = `以下のPR情報を100文字以内で要約してください。
  【PRのURL】
  ${pr.url}

  【PRタイトル】
  ${pr.title}

  【PR本文】
  ${pr.body}


  【主要な変更内容】
  ${pr.diff}
`;

        const retryOptions: RetryOptions = {
          maxAttempts: 3,
          minTimeout: 1000, // 初期遅延: 1秒
          multiplier: 2, // 2倍ずつ増加
          maxTimeout: 4000, // 最大遅延: 4秒
          jitter: 1, // ジッターを追加してサーバー負荷を分散
        };

        try {
          const messages = [
            { role: 'system', content: INSTRUCTIONS },
            { role: 'user', content: input },
          ];

          const summary = await callOpenAIWithRetry(
            openai as unknown as OpenAIClient,
            messages,
            'o3-mini',
            retryOptions,
          );

          return summary;
        } catch (error) {
          console.error('Error generating summary after all retries:', error);

          // エラーメッセージをチェックしてログに詳細を記録
          if (error instanceof Error) {
            if (error.message.includes('429') || error.message.includes('rate limit')) {
              console.error('OpenAI API rate limit exceeded');
            } else if (error.message.includes('timeout')) {
              console.error('OpenAI API request timed out');
            }
          }

          return fallback(pr);
        }
      },
    };
  }

  return {
    // deno-lint-ignore require-await
    async generateSummary({ title }: PullRequestInfo): Promise<string> {
      return title;
    },
  };
}

function fallback({ title, url }: PullRequestInfo): string {
  return `
皆様の政策提案がマニフェストに取り込まれました🎉
ご提案ありがとうございました🙇‍♂️
タイトル: ${title}
詳細はこちら: ${url}
引き続き皆様の政策提案、お待ちしております😊
  `;
}
