import { assertEquals } from '@std/assert';
import { Hono } from 'hono';
import { createManifestoHandlers } from './manifesto_create.ts';
import type { ManifestoRepository } from '../repositories/manifesto.ts';
import type { LLMService } from '../services/llm.ts';
import type { Manifesto } from '../types/models/manifesto.ts';

// テスト用定数
const TEST_GITHUB_PR_URL = 'https://github.com/team-mirai/policy/pull/123';

// モックリポジトリ
function createMockRepository(): ManifestoRepository {
  const saved: Manifesto[] = [];
  return {
    // deno-lint-ignore require-await
    async save(manifesto: Manifesto): Promise<void> {
      saved.push(manifesto);
    },
    // deno-lint-ignore require-await
    async findById(id: string): Promise<Manifesto | null> {
      return saved.find((m) => m.id === id) || null;
    },
    // deno-lint-ignore require-await
    async findAll(): Promise<Manifesto[]> {
      return saved;
    },
  };
}

// モックLLMサービス
function createMockLLMService(summary: string): LLMService {
  return {
    // deno-lint-ignore require-await
    async generateSummary(_content: string): Promise<string> {
      return summary;
    },
  };
}

// テスト用のアプリケーションセットアップ
function setupTestApp(
  repo = createMockRepository(),
  llm = createMockLLMService('要約'),
): Hono {
  const handlers = createManifestoHandlers(repo, llm);
  const app = new Hono();
  app.post('/test', ...handlers.create);
  return app;
}

Deno.test('マニフェスト作成ハンドラー', async (t) => {
  await t.step('正常にマニフェストを作成できる', async () => {
    const app = setupTestApp(
      createMockRepository(),
      createMockLLMService('要約されたテキスト'),
    );

    const res = await app.request('/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '環境政策の改革',
        content: '詳細な内容...',
        githubPrUrl: TEST_GITHUB_PR_URL,
      }),
    });

    assertEquals(res.status, 201);
    const json = await res.json();
    assertEquals(typeof json.id, 'string');
  });

  await t.step('バリデーションエラー', async (t) => {
    const app = setupTestApp();

    await t.step('タイトルが空の場合', async () => {
      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '',
          content: '内容',
          githubPrUrl: TEST_GITHUB_PR_URL,
        }),
      });

      assertEquals(res.status, 400);
      const json = await res.json();
      assertEquals(json.success, false);
      assertEquals(json.error.name, 'ZodError');
      assertEquals(json.error.issues[0].message, 'Title is required');
    });

    await t.step('内容が空の場合', async () => {
      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'タイトル',
          content: '',
          githubPrUrl: TEST_GITHUB_PR_URL,
        }),
      });

      assertEquals(res.status, 400);
      const json = await res.json();
      assertEquals(json.success, false);
      assertEquals(json.error.name, 'ZodError');
      assertEquals(json.error.issues[0].message, 'Content is required');
    });

    await t.step('GitHub PR URLが無効な場合', async () => {
      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'タイトル',
          content: '内容',
          githubPrUrl: 'not-a-url',
        }),
      });

      assertEquals(res.status, 400);
      const json = await res.json();
      assertEquals(json.success, false);
      assertEquals(json.error.name, 'ZodError');
      assertEquals(json.error.issues[0].message, 'GitHub PR URL must be a valid URL');
    });
  });

  await t.step('LLMサービスがエラーを返す場合', async () => {
    const errorLLM: LLMService = {
      // deno-lint-ignore require-await
      async generateSummary(_content: string): Promise<string> {
        throw new Error('LLM API error');
      },
    };
    const app = setupTestApp(createMockRepository(), errorLLM);

    const res = await app.request('/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'タイトル',
        content: '内容',
        githubPrUrl: TEST_GITHUB_PR_URL,
      }),
    });

    assertEquals(res.status, 500);
    const json = await res.json();
    assertEquals(json.error, 'Internal server error');
  });
});

Deno.test('マニフェスト一覧取得ハンドラー', async (t) => {
  function setupListTestApp(repo: ManifestoRepository): Hono {
    const app = new Hono();
    const handlers = createManifestoHandlers(repo, createMockLLMService('テスト要約'));

    // list ハンドラーはまだ実装されていないのでエラーになる
    app.get('/test/list', handlers.list);
    return app;
  }

  await t.step('空のリストを返す', async () => {
    const app = setupListTestApp(createMockRepository());

    const res = await app.request('/test/list', {
      method: 'GET',
    });

    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(json.manifestos, []);
  });

  await t.step('保存されたマニフェストを返す', async () => {
    const repo = createMockRepository();

    // テスト用データを事前に保存
    const testManifesto: Manifesto = {
      id: 'test-id',
      title: 'テストタイトル',
      summary: 'テスト要約',
      content: 'テスト内容',
      githubPrUrl: TEST_GITHUB_PR_URL,
      createdAt: new Date('2023-01-01T00:00:00Z'),
    };
    await repo.save(testManifesto);

    const app = setupListTestApp(repo);

    const res = await app.request('/test/list', {
      method: 'GET',
    });

    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(json.manifestos.length, 1);
    assertEquals(json.manifestos[0].id, 'test-id');
    assertEquals(json.manifestos[0].title, 'テストタイトル');
  });
});
