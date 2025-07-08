import { assertEquals } from '@std/assert';
import { createXNotificationService } from './x_notification.ts';

Deno.test('X通知サービス', async (t) => {
  await t.step('正常に投稿できる', async () => {
    const mockFetch = (url: string | URL | Request, init?: RequestInit) => {
      const urlString = url.toString();

      if (urlString === 'https://api.twitter.com/2/tweets') {
        const body = JSON.parse(init?.body as string);
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: '1234567890123456789',
                text: body.text,
              },
            }),
            { status: 201 },
          ),
        );
      }

      return Promise.resolve(new Response('Not Found', { status: 404 }));
    };

    const service = createXNotificationService({
      apiKey: 'test-api-key',
      apiKeySecret: 'test-api-key-secret',
      accessToken: 'test-access-token',
      accessTokenSecret: 'test-access-token-secret',
      fetchFn: mockFetch,
    });

    const result = await service.notify('テストタイトル', 'テスト内容です。');

    assertEquals(result.success, true);
    assertEquals(result.url, 'https://x.com/TeamMirai/status/1234567890123456789');
  });

  await t.step('280文字を超える場合は切り詰める', async () => {
    const mockFetch = (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);
      const text = body.text;

      // 文字数を確認（...を含めて280文字以内）
      assertEquals(text.length <= 280, true);
      assertEquals(text.endsWith('...'), true);

      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              id: '1234567890123456789',
              text: text,
            },
          }),
          { status: 201 },
        ),
      );
    };

    const service = createXNotificationService({
      apiKey: 'test-api-key',
      apiKeySecret: 'test-api-key-secret',
      accessToken: 'test-access-token',
      accessTokenSecret: 'test-access-token-secret',
      fetchFn: mockFetch,
    });

    const longContent = 'あ'.repeat(300); // 300文字
    const result = await service.notify('長いタイトル', longContent);

    assertEquals(result.success, true);
  });

  await t.step('API エラーの場合', async () => {
    const mockFetch = () => Promise.resolve(new Response('Server Error', { status: 500 }));

    const service = createXNotificationService({
      apiKey: 'test-api-key',
      apiKeySecret: 'test-api-key-secret',
      accessToken: 'test-access-token',
      accessTokenSecret: 'test-access-token-secret',
      fetchFn: mockFetch,
    });

    const result = await service.notify('テストタイトル', 'テスト内容');

    assertEquals(result.success, false);
    assertEquals(result.message?.includes('Failed to post to X'), true);
  });

  await t.step('プラットフォーム名を返す', () => {
    const service = createXNotificationService({
      apiKey: 'test-api-key',
      apiKeySecret: 'test-api-key-secret',
      accessToken: 'test-access-token',
      accessTokenSecret: 'test-access-token-secret',
    });

    assertEquals(service.getPlatformName(), 'x');
  });

  await t.step('レート制限エラーの場合', async () => {
    const mockFetch = () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            title: 'Too Many Requests',
            detail: 'Rate limit exceeded',
            type: 'about:blank',
            status: 429,
          }),
          {
            status: 429,
            headers: {
              'x-rate-limit-remaining': '0',
              'x-rate-limit-reset': String(Date.now() / 1000 + 900), // 15分後
            },
          },
        ),
      );

    const service = createXNotificationService({
      apiKey: 'test-api-key',
      apiKeySecret: 'test-api-key-secret',
      accessToken: 'test-access-token',
      accessTokenSecret: 'test-access-token-secret',
      fetchFn: mockFetch,
    });

    const result = await service.notify('テストタイトル', 'テスト内容');

    assertEquals(result.success, false);
    assertEquals(result.message?.includes('X API error: 429'), true);
  });

  await t.step('認証エラーの場合', async () => {
    const mockFetch = () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            title: 'Unauthorized',
            detail: 'Invalid authentication credentials',
            type: 'about:blank',
            status: 401,
          }),
          { status: 401 },
        ),
      );

    const service = createXNotificationService({
      apiKey: 'test-api-key',
      apiKeySecret: 'test-api-key-secret',
      accessToken: 'test-access-token',
      accessTokenSecret: 'test-access-token-secret',
      fetchFn: mockFetch,
    });

    const result = await service.notify('テストタイトル', 'テスト内容');

    assertEquals(result.success, false);
    assertEquals(result.message?.includes('X API error: 401'), true);
  });
});
