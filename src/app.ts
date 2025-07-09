import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { bearerAuth } from './middleware/auth.ts';
import { createManifestoRepository } from './repositories/manifesto.ts';
import { createNotificationHistoryRepository } from './repositories/notification_history.ts';
import { createLLMService } from './services/llm.ts';
import { createGitHubService } from './services/github.ts';
import { createXNotificationService } from './services/x_notification.ts';
import { createManifestoNotifyHandler } from './handlers/manifesto_notify.ts';
import { createNotificationHistoryListHandler } from './handlers/notification_history_list.ts';
import { createXClient } from './repositories/x.ts';
import { config } from './config.ts';

/**
 * アプリケーションを作成する
 * @param kv Deno KVインスタンス（テスト時は外部から注入）
 * @returns Honoアプリケーション
 */
export async function createApp(kv?: Deno.Kv): Promise<Hono> {
  // 依存関係の構築
  const githubToken = Deno.env.get('GITHUB_TOKEN');

  const llmService = createLLMService();
  const githubService = createGitHubService(fetch, githubToken);

  const kvInstance = kv || await Deno.openKv();
  const manifestoRepo = createManifestoRepository(kvInstance);
  const historyRepo = createNotificationHistoryRepository(kvInstance);

  const xClient = createXClient();
  const notificationService = createXNotificationService(xClient);

  const notifyHandler = createManifestoNotifyHandler(
    manifestoRepo,
    historyRepo,
    githubService,
    llmService,
    notificationService,
  );

  const historyListHandler = createNotificationHistoryListHandler(historyRepo);

  const app = new Hono();

  // API認証ミドルウェア
  if (config.isProd()) {
    const apiToken = Deno.env.get('API_TOKEN');
    if (!apiToken) {
      throw new Error('API_TOKEN environment variable is required');
    }
    app.use('/api/*', bearerAuth(apiToken));
  }

  // グローバルミドルウェア
  app.use('*', logger());
  app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // APIエンドポイント
  app.post('/api/manifestos/notify', ...notifyHandler);
  app.get('/api/manifestos/notify/histories', historyListHandler);
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
