import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { bearerAuth } from './middleware/auth.ts';
import { createManifestoRepository } from './repositories/manifesto.ts';
import { createNotificationHistoryRepository } from './repositories/notification_history.ts';
import { createLLMService } from './services/llm.ts';
import { createGitHubService } from './services/github.ts';
import { createXNotificationService } from './services/x_notification.ts';
import { createManifestoNotifyHandler } from './handlers/manifesto_notify.ts';

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

  const apiToken = Deno.env.get('API_TOKEN');
  if (!apiToken) {
    throw new Error('API_TOKEN environment variable is required');
  }

  const githubToken = Deno.env.get('GITHUB_TOKEN');
  const xApiKey = Deno.env.get('X_API_KEY');
  const xApiKeySecret = Deno.env.get('X_API_KEY_SECRET');
  const xAccessToken = Deno.env.get('X_ACCESS_TOKEN');
  const xAccessTokenSecret = Deno.env.get('X_ACCESS_TOKEN_SECRET');

  // 依存関係の構築
  const kvInstance = kv || await Deno.openKv();
  const manifestoRepo = createManifestoRepository(kvInstance);
  const historyRepo = createNotificationHistoryRepository(kvInstance);
  const llmService = createLLMService(openaiApiKey);
  const githubService = createGitHubService(fetch, githubToken);

  // X通知サービスの設定（必須）
  if (!xApiKey || !xApiKeySecret || !xAccessToken || !xAccessTokenSecret) {
    throw new Error(
      'X API credentials are required (X_API_KEY, X_API_KEY_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET)',
    );
  }

  const xNotificationService = createXNotificationService({
    apiKey: xApiKey,
    apiKeySecret: xApiKeySecret,
    accessToken: xAccessToken,
    accessTokenSecret: xAccessTokenSecret,
  });

  const notifyHandler = createManifestoNotifyHandler(
    manifestoRepo,
    historyRepo,
    githubService,
    llmService,
    xNotificationService,
  );

  const app = new Hono();

  // グローバルミドルウェア
  app.use('*', logger());

  app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // API認証ミドルウェア
  app.use('/api/*', bearerAuth(apiToken));

  // APIエンドポイント
  app.post('/api/manifestos/notify', ...notifyHandler);
  app.get('/api/manifestos', async (c) => {
    try {
      const manifestos = await manifestoRepo.findAll();
      return c.json({ manifestos }, 200);
    } catch (error) {
      console.error('Error listing manifestos:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  });

  return app;
}
