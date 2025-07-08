import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { bearerAuth } from './middleware/auth.ts';
import { createManifestoRepository } from './repositories/manifesto.ts';
import { createLLMService } from './services/llm.ts';
import { createManifestoHandlers } from './handlers/manifesto.ts';

/**
 * アプリケーションを作成する
 * @param kv Deno KVインスタンス（テスト時は外部から注入）
 * @returns Honoアプリケーション
 */
export async function createApp(kv?: Deno.Kv): Promise<Hono> {
  // 環境変数の確認
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  // 依存関係の構築
  const kvInstance = kv || await Deno.openKv();
  const manifestoRepo = createManifestoRepository(kvInstance);
  const openaiService = createLLMService(openaiApiKey);
  const manifestoHandlers = createManifestoHandlers(manifestoRepo, openaiService);

  const app = new Hono();

  // グローバルミドルウェア
  app.use('*', logger());

  app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // API認証ミドルウェア
  app.use('/api/*', bearerAuth());

  // APIエンドポイント
  app.post('/api/manifestos', manifestoHandlers.create);

  return app;
}

