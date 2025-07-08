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

// バリデーターの定義
const createManifestoValidator = zValidator('json', createManifestoSchema);

export type ManifestoHandlers = {
  create: [
    ReturnType<typeof zValidator>,
    (c: Context) => Promise<Response>,
  ];
};

/**
 * 新しいマニフェストを作成する
 */
async function createManifesto(
  input: CreateManifestoInput,
  llm: LLMService,
): Promise<Manifesto> {
  const summary = await llm.generateSummary(input.content);

  return {
    id: crypto.randomUUID(),
    title: input.title,
    summary,
    content: input.content,
    githubPrUrl: input.githubPrUrl,
    createdAt: new Date(),
  };
}

/**
 * 作成ハンドラーを生成する
 */
function createHandler(
  repo: ManifestoRepository,
  llm: LLMService,
): (c: Context) => Promise<Response> {
  return async (c: Context) => {
    try {
      const validatedData = await c.req.json<CreateManifestoInput>();
      const manifesto = await createManifesto(validatedData, llm);
      await repo.save(manifesto);

      const response: CreateManifestoResponse = { id: manifesto.id };
      return c.json(response, 201);
    } catch (error) {
      console.error('Error creating manifesto:', error);
      const response: ErrorResponse = { error: 'Internal server error' };
      return c.json(response, 500);
    }
  };
}

/**
 * マニフェストハンドラーを作成する
 * @param repo マニフェストリポジトリ
 * @param llm LLMサービス
 * @returns マニフェストハンドラー
 */
export function createManifestoHandlers(
  repo: ManifestoRepository,
  llm: LLMService,
): ManifestoHandlers {
  return {
    create: [
      createManifestoValidator,
      createHandler(repo, llm),
    ],
  };
}
