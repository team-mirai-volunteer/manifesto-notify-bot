import { assertEquals, assertRejects } from '@std/assert';
import { spy } from '@std/testing/mock';
import { callOpenAIWithRetry, createLLMService, isRetryableError } from './llm.ts';
import type { OpenAIClient } from './llm.ts';

Deno.test('LLMサービス', async (t) => {
  await t.step('isRetryableError', async (t) => {
    await t.step('リトライ可能なステータスコードを正しく判定', () => {
      // 403 - リトライ可能
      assertEquals(isRetryableError({ status: 403 }), true);

      // 429 - レート制限
      assertEquals(isRetryableError({ status: 429 }), true);

      // 500番台のエラー
      assertEquals(isRetryableError({ status: 500 }), true);
      assertEquals(isRetryableError({ status: 502 }), true);
      assertEquals(isRetryableError({ status: 503 }), true);
      assertEquals(isRetryableError({ status: 504 }), true);
    });

    await t.step('リトライ不可能なステータスコードを正しく判定', () => {
      // 401 - 認証エラー
      assertEquals(isRetryableError({ status: 401 }), false);

      // 400 - Bad Request
      assertEquals(isRetryableError({ status: 400 }), false);

      // 404 - Not Found
      assertEquals(isRetryableError({ status: 404 }), false);
    });

    await t.step('statusプロパティがない場合はfalse', () => {
      assertEquals(isRetryableError({}), false);
      assertEquals(isRetryableError(null), false);
      assertEquals(isRetryableError(undefined), false);
      assertEquals(isRetryableError('error'), false);
      assertEquals(isRetryableError(new Error('test')), false);
    });
  });

  await t.step('callOpenAIWithRetry', async (t) => {
    await t.step('正常なレスポンスの場合はコンテンツを返す', async () => {
      const mockCreate = spy(() =>
        Promise.resolve({
          choices: [{
            message: {
              content: 'テスト要約',
            },
          }],
        })
      );

      const mockClient: OpenAIClient = {
        chat: {
          completions: {
            // deno-lint-ignore no-explicit-any
            create: mockCreate as any,
          },
        },
      };

      const messages = [{ role: 'user', content: 'test' }];
      const result = await callOpenAIWithRetry(
        mockClient,
        messages,
        'test-model',
        { maxAttempts: 1 },
      );

      assertEquals(result, 'テスト要約');
      assertEquals(mockCreate.calls.length, 1);
    });

    await t.step('コンテンツがnullの場合はエラー', async () => {
      const mockCreate = spy(() =>
        Promise.resolve({
          choices: [{
            message: {
              content: null,
            },
          }],
        })
      );

      const mockClient: OpenAIClient = {
        chat: {
          completions: {
            // deno-lint-ignore no-explicit-any
            create: mockCreate as any,
          },
        },
      };

      const messages = [{ role: 'user', content: 'test' }];

      await assertRejects(
        async () => {
          await callOpenAIWithRetry(
            mockClient,
            messages,
            'test-model',
            { maxAttempts: 1 },
          );
        },
        Error,
        'No content in OpenAI response',
      );
    });

    await t.step('choicesが空の場合はエラー', async () => {
      const mockCreate = spy(() =>
        Promise.resolve({
          choices: [],
        })
      );

      const mockClient: OpenAIClient = {
        chat: {
          completions: {
            // deno-lint-ignore no-explicit-any
            create: mockCreate as any,
          },
        },
      };

      const messages = [{ role: 'user', content: 'test' }];

      await assertRejects(
        async () => {
          await callOpenAIWithRetry(
            mockClient,
            messages,
            'test-model',
            { maxAttempts: 1 },
          );
        },
        Error,
        'No content in OpenAI response',
      );
    });

    await t.step('リトライ可能なエラーの場合はリトライする', async () => {
      let callCount = 0;
      const mockCreate = spy(() => {
        callCount++;
        if (callCount === 1) {
          // 最初の呼び出しは503エラー
          throw { status: 503, message: 'Service Unavailable' };
        }
        // 2回目の呼び出しは成功
        return Promise.resolve({
          choices: [{
            message: {
              content: '成功した要約',
            },
          }],
        });
      });

      const mockClient: OpenAIClient = {
        chat: {
          completions: {
            // deno-lint-ignore no-explicit-any
            create: mockCreate as any,
          },
        },
      };

      const messages = [{ role: 'user', content: 'test' }];
      const result = await callOpenAIWithRetry(
        mockClient,
        messages,
        'test-model',
        {
          maxAttempts: 3,
          minTimeout: 10, // テストを高速化
          maxTimeout: 50,
        },
      );

      assertEquals(result, '成功した要約');
      assertEquals(mockCreate.calls.length, 2);
    });

    await t.step('403エラーもリトライ対象', async () => {
      let callCount = 0;
      const mockCreate = spy(() => {
        callCount++;
        if (callCount === 1) {
          // 最初の呼び出しは403エラー
          throw { status: 403, message: 'Forbidden' };
        }
        // 2回目の呼び出しは成功
        return Promise.resolve({
          choices: [{
            message: {
              content: '成功した要約',
            },
          }],
        });
      });

      const mockClient: OpenAIClient = {
        chat: {
          completions: {
            // deno-lint-ignore no-explicit-any
            create: mockCreate as any,
          },
        },
      };

      const messages = [{ role: 'user', content: 'test' }];
      const result = await callOpenAIWithRetry(
        mockClient,
        messages,
        'test-model',
        {
          maxAttempts: 3,
          minTimeout: 10,
          maxTimeout: 50,
        },
      );

      assertEquals(result, '成功した要約');
      assertEquals(mockCreate.calls.length, 2);
    });

    await t.step('リトライ不可能なエラーの場合は即座に失敗', async () => {
      const mockCreate = spy(() => {
        throw { status: 401, message: 'Unauthorized' };
      });

      const mockClient: OpenAIClient = {
        chat: {
          completions: {
            // deno-lint-ignore no-explicit-any
            create: mockCreate as any,
          },
        },
      };

      const messages = [{ role: 'user', content: 'test' }];

      await assertRejects(
        async () => {
          await callOpenAIWithRetry(
            mockClient,
            messages,
            'test-model',
            {
              maxAttempts: 3,
              minTimeout: 10,
            },
          );
        },
      );

      // リトライせずに1回のみ呼ばれる
      assertEquals(mockCreate.calls.length, 1);
    });

    await t.step('最大リトライ回数を超えた場合は失敗', async () => {
      const mockCreate = spy(() => {
        throw { status: 503, message: 'Service Unavailable' };
      });

      const mockClient: OpenAIClient = {
        chat: {
          completions: {
            // deno-lint-ignore no-explicit-any
            create: mockCreate as any,
          },
        },
      };

      const messages = [{ role: 'user', content: 'test' }];

      await assertRejects(
        async () => {
          await callOpenAIWithRetry(
            mockClient,
            messages,
            'test-model',
            {
              maxAttempts: 3,
              minTimeout: 10,
              maxTimeout: 50,
            },
          );
        },
      );

      // 3回リトライされる
      assertEquals(mockCreate.calls.length, 3);
    });
  });

  await t.step('createLLMService', async (t) => {
    await t.step('開発環境では入力タイトルをそのまま返す', async () => {
      const service = createLLMService(false);
      const result = await service.generateSummary({
        title: 'テストPRタイトル',
        body: 'テスト本文',
        diff: 'テスト差分',
        url: 'https://github.com/test/repo/pull/1',
      });

      assertEquals(result, 'テストPRタイトル');
    });
  });
});
