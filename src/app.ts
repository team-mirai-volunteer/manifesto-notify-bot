import { Hono } from 'hono';
import { logger } from 'hono/logger';

export function createApp() {
  const app = new Hono();

  // ミドルウェア
  app.use('*', logger());

  // ルート
  app.get('/', (c) => c.text('Hello, Manifesto Notify Bot!'));

  // ヘルスチェック
  app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

  return app;
}
