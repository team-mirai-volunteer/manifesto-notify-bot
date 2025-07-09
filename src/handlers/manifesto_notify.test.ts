import { assertEquals } from 'jsr:@std/assert';
import { Hono } from 'hono';
import { createManifestoNotifyHandler } from './manifesto_notify.ts';
import { createManifestoRepository } from '../repositories/manifesto.ts';
import { createNotificationHistoryRepository } from '../repositories/notification_history.ts';
import type { GitHubService } from '../services/github.ts';
import type { LLMService } from '../services/llm.ts';
import type { NotificationResult, NotificationService } from '../services/notification.ts';
import type { Manifesto } from '../types/models/manifesto.ts';

Deno.test('マニフェスト通知ハンドラー', async (t) => {
  const kv = await Deno.openKv(':memory:');
  const manifestoRepo = createManifestoRepository(kv);
  const historyRepo = createNotificationHistoryRepository(kv);

  const mockGitHubService: GitHubService = {
    getPullRequest() {
      return Promise.resolve({
        title: 'テストPR',
        diff: 'テスト変更差分',
      });
    },
  };

  const mockLLMService: LLMService = {
    generateSummary() {
      return Promise.resolve('テスト要約');
    },
  };

  const mockNotificationService: NotificationService = {
    notify() {
      return Promise.resolve({
        success: true,
        url: 'https://x.com/test/status/123',
      });
    },
  };

  await t.step('存在するマニフェストを通知できる', async () => {
    // 既存のマニフェストを保存
    const existingManifesto: Manifesto = {
      id: 'test-id',
      title: 'テストマニフェスト',
      summary: 'テスト要約',
      content: 'テスト内容',
      githubPrUrl: 'https://github.com/test/repo/pull/123',
      createdAt: new Date(),
    };
    await manifestoRepo.save(existingManifesto);

    const app = new Hono();
    const handler = createManifestoNotifyHandler(
      manifestoRepo,
      historyRepo,
      mockGitHubService,
      mockLLMService,
      mockNotificationService,
    );

    // RED: createManifestoNotifyHandlerが存在しない状態でテストを実行
    app.post('/notify', ...handler);

    const res = await app.request('/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        githubPrUrl: 'https://github.com/test/repo/pull/123',
      }),
    });

    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.manifestoId, 'test-id');
    assertEquals(body.notifications.x.success, true);
    assertEquals(body.notifications.x.url, 'https://x.com/test/status/123');
  });

  await t.step('存在しないマニフェストの場合は新規作成して通知', async () => {
    const app = new Hono();
    const handler = createManifestoNotifyHandler(
      manifestoRepo,
      historyRepo,
      mockGitHubService,
      mockLLMService,
      mockNotificationService,
    );

    // RED: createManifestoNotifyHandlerが存在しない状態でテストを実行
    app.post('/notify', ...handler);

    const res = await app.request('/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        githubPrUrl: 'https://github.com/test/repo/pull/456',
      }),
    });

    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(typeof body.manifestoId, 'string');
    assertEquals(body.notifications.x.success, true);
    assertEquals(body.notifications.x.url, 'https://x.com/test/status/123');
  });

  await t.step('すべてのプラットフォームに通知', async () => {
    const app = new Hono();
    const handler = createManifestoNotifyHandler(
      manifestoRepo,
      historyRepo,
      mockGitHubService,
      mockLLMService,
      mockNotificationService,
    );

    // RED: createManifestoNotifyHandlerが存在しない状態でテストを実行
    app.post('/notify', ...handler);

    const res = await app.request('/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        githubPrUrl: 'https://github.com/test/repo/pull/789',
      }),
    });

    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(typeof body.manifestoId, 'string');
    assertEquals(body.notifications.x.success, true);
    assertEquals(body.notifications.x.url, 'https://x.com/test/status/123');
  });

  await t.step('無効なGitHub PR URLの場合は400エラー', async () => {
    const app = new Hono();
    const handler = createManifestoNotifyHandler(
      manifestoRepo,
      historyRepo,
      mockGitHubService,
      mockLLMService,
      mockNotificationService,
    );

    app.post('/notify', ...handler);

    // 通常のURLだがPR URLではない
    const res1 = await app.request('/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-api-token',
      },
      body: JSON.stringify({
        githubPrUrl: 'https://github.com/test/repo',
      }),
    });

    assertEquals(res1.status, 400);
    await res1.text(); // レスポンスボディを消費

    // issueのURL
    const res2 = await app.request('/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-api-token',
      },
      body: JSON.stringify({
        githubPrUrl: 'https://github.com/test/repo/issues/123',
      }),
    });

    assertEquals(res2.status, 400);
    await res2.text(); // レスポンスボディを消費
  });

  await t.step('無効なリクエストボディの場合は400エラー', async () => {
    const app = new Hono();
    const handler = createManifestoNotifyHandler(
      manifestoRepo,
      historyRepo,
      mockGitHubService,
      mockLLMService,
      mockNotificationService,
    );

    // RED: createManifestoNotifyHandlerが存在しない状態でテストを実行
    app.post('/notify', ...handler);

    const res = await app.request('/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invalidField: 'invalid',
      }),
    });

    assertEquals(res.status, 400);
  });

  await t.step('通知失敗時でも200を返し、失敗情報を含む', async () => {
    const app = new Hono();

    // 通知失敗するモック
    const failingNotificationService: NotificationService = {
      notify: (_title: string, _content: string): Promise<NotificationResult> => {
        return Promise.resolve({
          success: false,
          message: 'X API error: rate limit exceeded',
        });
      },
    };

    const handler = createManifestoNotifyHandler(
      manifestoRepo,
      historyRepo,
      mockGitHubService,
      mockLLMService,
      failingNotificationService,
    );

    app.post('/notify', ...handler);

    const res = await app.request('/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        githubPrUrl: 'https://github.com/test/repo/pull/999',
      }),
    });

    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(typeof body.manifestoId, 'string');
    assertEquals(body.notifications.x.success, false);
    assertEquals(body.notifications.x.message, 'X API error: rate limit exceeded');
    assertEquals(body.notifications.x.url, undefined);

    // 通知履歴が保存されていないことを確認
    const histories = await historyRepo.findAll();
    const failedHistory = histories.find((h) =>
      h.githubPrUrl === 'https://github.com/test/repo/pull/999'
    );
    assertEquals(failedHistory, undefined);
  });

  await kv.close();
});
