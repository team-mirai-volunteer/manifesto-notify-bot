import type { Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { ManifestoRepository } from '../repositories/manifesto.ts';
import type { LLMService } from '../services/llm.ts';
import type { CreateManifestoResponse, ErrorResponse } from '../types/api/manifesto.ts';
import type { Manifesto } from '../types/models/manifesto.ts';

// バリデーションスキーマ
const createManifestoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  githubPrUrl: z.string().url('GitHub PR URL must be a valid URL').min(
    1,
    'GitHub PR URL is required',
  ),
});

// スキーマから型を推論
type CreateManifestoInput = z.infer<typeof createManifestoSchema>;

export type ManifestoHandlers = {
  create: [
    (c: Context, next: () => Promise<void>) => Promise<Response | void>,
    (c: Context) => Promise<Response>,
  ];
};

// バリデーターの定義
export const createManifestoValidator = zValidator('json', createManifestoSchema);

/**
 * マニフェストハンドラーを作成する
 * @param repo マニフェストリポジトリ
 * @param openai OpenAIサービス
 * @returns マニフェストハンドラー
 */
export function createManifestoHandlers(
  repo: ManifestoRepository,
  llm: LLMService,
): ManifestoHandlers {
  return {
    create: [
      createManifestoValidator,
      async (c: Context) => {
        try {
          // バリデーション済みのデータを取得（型アサーションを使用）
          const validatedData = await c.req.json<CreateManifestoInput>();

          // LLMで要約を生成
          const summary = await llm.generateSummary(validatedData.content);

          // マニフェストを作成
          const manifesto: Manifesto = {
            id: crypto.randomUUID(),
            title: validatedData.title,
            summary: summary,
            content: validatedData.content,
            githubPrUrl: validatedData.githubPrUrl,
            createdAt: new Date(),
          };

          // 保存
          await repo.save(manifesto);

          // レスポンス
          const response: CreateManifestoResponse = {
            id: manifesto.id,
          };

          return c.json(response, 201);
        } catch (error) {
          console.error('Error creating manifesto:', error);
          const response: ErrorResponse = { error: 'Internal server error' };
          return c.json(response, 500);
        }
      },
    ],
  };
}
