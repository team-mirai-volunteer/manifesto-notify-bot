import type { Context } from 'hono';
import type { ManifestoRepository } from '../repositories/manifesto.ts';
import type { LLMService } from '../services/llm.ts';
import type {
  CreateManifestoRequest,
  CreateManifestoResponse,
  ErrorResponse,
} from '../types/api/manifesto.ts';
import type { Manifesto } from '../types/models/manifesto.ts';

export type ManifestoHandlers = {
  create: (c: Context) => Promise<Response>;
};

/**
 * マニフェストハンドラーを作成する
 * @param repo マニフェストリポジトリ
 * @param openai OpenAIサービス
 * @returns マニフェストハンドラー
 */
export function createManifestoHandlers(
  repo: ManifestoRepository,
  openai: LLMService,
): ManifestoHandlers {
  const validateCreateRequest = (body: CreateManifestoRequest): ErrorResponse | null => {
    if (!body.title) {
      return { error: 'Title is required' };
    }
    if (!body.content) {
      return { error: 'Content is required' };
    }
    if (!body.githubPrUrl) {
      return { error: 'GitHub PR URL is required' };
    }
    return null;
  };

  return {
    async create(c: Context) {
      try {
        const body = await c.req.json<CreateManifestoRequest>();

        const validationError = validateCreateRequest(body);
        if (validationError) {
          return c.json(validationError, 400);
        }

        const summary = await openai.generateSummary(body.content);

        const manifesto: Manifesto = {
          id: crypto.randomUUID(),
          title: body.title,
          summary: summary,
          content: body.content,
          githubPrUrl: body.githubPrUrl,
          createdAt: new Date(),
        };

        await repo.save(manifesto);

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
  };
}

