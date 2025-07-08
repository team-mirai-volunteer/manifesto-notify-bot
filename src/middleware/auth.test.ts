import { assertEquals } from '@std/assert';
import { Hono } from 'hono';
import { bearerAuth } from './auth.ts';

// テスト用のモックアプリケーションを作成
function createTestApp(token: string) {
  const app = new Hono();
  app.use('/protected/*', bearerAuth(token));
  app.get('/protected/test', (c) => c.json({ message: 'success' }));
  return app;
}

Deno.test('Bearer認証ミドルウェア', async (t) => {
  await t.step('正常な認証', async (t) => {
    await t.step('有効なトークンでアクセスできる', async () => {
      const app = createTestApp('test-token-123');
      const res = await app.request('/protected/test', {
        headers: {
          'Authorization': 'Bearer test-token-123',
        },
      });

      assertEquals(res.status, 200);
      const json = await res.json();
      assertEquals(json.message, 'success');
    });
  });

  await t.step('認証エラー', async (t) => {
    await t.step('Authorizationヘッダーがない場合', async () => {
      const app = createTestApp('test-token');
      const res = await app.request('/protected/test');

      assertEquals(res.status, 401);
      const json = await res.json();
      assertEquals(json.error, 'Authorization header required');
    });

    await t.step('Bearer形式でない場合', async () => {
      const app = createTestApp('test-token');
      const res = await app.request('/protected/test', {
        headers: {
          'Authorization': 'Basic dGVzdDp0ZXN0',
        },
      });

      assertEquals(res.status, 401);
      const json = await res.json();
      assertEquals(json.error, 'Invalid authorization format');
    });

    await t.step('無効なトークンの場合', async () => {
      const app = createTestApp('correct-token');
      const res = await app.request('/protected/test', {
        headers: {
          'Authorization': 'Bearer wrong-token',
        },
      });

      assertEquals(res.status, 401);
      const json = await res.json();
      assertEquals(json.error, 'Invalid token');
    });
  });
});
