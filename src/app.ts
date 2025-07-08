import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { bearerAuth } from './middleware/auth.ts';
import { createManifestoRepository } from './repositories/manifesto.ts';
import { createNotificationHistoryRepository } from './repositories/notification_history.ts';
import { createLLMService } from './services/llm.ts';
import { createGitHubService } from './services/github.ts';
import { createXNotificationService } from './services/x_notification.ts';
import type { NotificationService } from './services/notification.ts';
import { createManifestoHandlers } from './handlers/manifesto_create.ts';
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
  const githubService = createGitHubService(githubToken);

  // 通知サービスの設定
  const notificationServices: Record<string, NotificationService> = {};
  if (xApiKey && xApiKeySecret && xAccessToken && xAccessTokenSecret) {
    notificationServices.x = createXNotificationService({
      apiKey: xApiKey,
      apiKeySecret: xApiKeySecret,
      accessToken: xAccessToken,
      accessTokenSecret: xAccessTokenSecret,
    });
  }

  const manifestoHandlers = createManifestoHandlers(manifestoRepo, llmService);
  const notifyHandler = createManifestoNotifyHandler(
    manifestoRepo,
    historyRepo,
    githubService,
    llmService,
    notificationServices,
  );

  const app = new Hono();

  // グローバルミドルウェア
  app.use('*', logger());

  app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // API認証ミドルウェア
  app.use('/api/*', bearerAuth(apiToken));

  // APIエンドポイント
  app.post('/api/manifestos/notify', ...notifyHandler);
  app.get('/api/manifestos', manifestoHandlers.list);

  return app;
}
