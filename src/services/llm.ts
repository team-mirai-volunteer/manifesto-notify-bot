import OpenAI from '@openai/openai';
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

        try {
          const resp = await openai.chat.completions.create({
            model: 'o3-mini',
            messages: [
              { role: 'system', content: INSTRUCTIONS },
              { role: 'user', content: input },
            ],
          });

          const summary = resp.choices.shift()?.message.content;
          if (!summary) {
            console.warn('No choices returned from OpenAI API');
            return fallback(pr);
          }

          return summary;
        } catch (error) {
          console.error('Error generating summary:', error);
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
