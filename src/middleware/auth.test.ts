import { assertEquals } from '@std/assert';
import { Hono } from 'hono';
import { bearerAuth } from './auth.ts';

// テスト用のモックアプリケーションを作成
function createTestApp() {
  const app = new Hono();
  app.use('/protected/*', bearerAuth());
  app.get('/protected/test', (c) => c.json({ message: 'success' }));
  return app;
}

// 環境変数を一時的に設定するヘルパー関数
async function withEnvVar(
  name: string,
  value: string,
  fn: () => Promise<void>,
): Promise<void> {
  const original = Deno.env.get(name);
  Deno.env.set(name, value);
  try {
    await fn();
  } finally {
    if (original) {
      Deno.env.set(name, original);
    } else {
      Deno.env.delete(name);
    }
  }
}

Deno.test('Bearer認証ミドルウェア', async (t) => {
  await t.step('正常な認証', async (t) => {
    await t.step('有効なトークンでアクセスできる', async () => {
      await withEnvVar('API_TOKEN', 'test-token-123', async () => {
        const app = createTestApp();
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
  });

  await t.step('認証エラー', async (t) => {
    await t.step('Authorizationヘッダーがない場合', async () => {
      const app = createTestApp();
      const res = await app.request('/protected/test');

      assertEquals(res.status, 401);
      const json = await res.json();
      assertEquals(json.error, 'Authorization header required');
    });

    await t.step('Bearer形式でない場合', async () => {
      const app = createTestApp();
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
      await withEnvVar('API_TOKEN', 'correct-token', async () => {
        const app = createTestApp();
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
});
