import { assertEquals } from 'jsr:@std/assert';
import { Hono } from 'hono';
import { createManifestoNotifyHandler } from './manifesto_notify.ts';
import { createManifestoRepository } from '../repositories/manifesto.ts';
import { createNotificationHistoryRepository } from '../repositories/notification_history.ts';
import type { GitHubService, PullRequestInfo } from '../services/github.ts';
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
        url: '',
        title: 'テストPR',
        body: 'テストPRの内容',
        diff: 'テスト変更差分',
      });
    },
  };

  const mockLLMService: LLMService = {
    generateSummary(_: PullRequestInfo): Promise<string> {
      return Promise.resolve('Mock summary');
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
      diff: 'テスト内容',
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

  await t.step('新規マニフェストで要約対象外の場合は通知をスキップ', async () => {
    const app = new Hono();

    // 要約対象外を返すモック
    const excludedLLMService: LLMService = {
      generateSummary(_: PullRequestInfo): Promise<string> {
        return Promise.resolve('要約対象外');
      },
    };

    const handler = createManifestoNotifyHandler(
      manifestoRepo,
      historyRepo,
      mockGitHubService,
      excludedLLMService,
      mockNotificationService,
    );

    app.post('/notify', ...handler);

    const res = await app.request('/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        githubPrUrl: 'https://github.com/test/repo/pull/1000',
      }),
    });

    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.message, 'This PR is not suitable for notification.');
    assertEquals(body.manifestoId, undefined);
    assertEquals(body.notifications, undefined);

    // マニフェストが保存されていないことを確認
    const manifesto = await manifestoRepo.findByPrUrl('https://github.com/test/repo/pull/1000');
    assertEquals(manifesto, null);
  });

  await t.step('通知失敗時でも200を返し、失敗情報を含む', async () => {
    const app = new Hono();

    // 通知失敗するモック
    const failingNotificationService: NotificationService = {
      notify: (_: Manifesto): Promise<NotificationResult> => {
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

  await t.step('GitHubサービスがエラーの場合は500エラー', async () => {
    const app = new Hono();

    // エラーを返すモック
    const errorGitHubService: GitHubService = {
      getPullRequest() {
        return Promise.reject(new Error('GitHub API rate limit exceeded'));
      },
    };

    const handler = createManifestoNotifyHandler(
      manifestoRepo,
      historyRepo,
      errorGitHubService,
      mockLLMService,
      mockNotificationService,
    );

    app.post('/notify', ...handler);

    const res = await app.request('/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        githubPrUrl: 'https://github.com/test/repo/pull/2000',
      }),
    });

    assertEquals(res.status, 500);
    const body = await res.json();
    assertEquals(body.error, 'Internal server error');
  });

  await t.step('LLMサービスがエラーの場合は500エラー', async () => {
    const app = new Hono();

    // エラーを返すモック
    const errorLLMService: LLMService = {
      generateSummary(_: PullRequestInfo): Promise<string> {
        return Promise.reject(new Error('OpenAI API error'));
      },
    };

    const handler = createManifestoNotifyHandler(
      manifestoRepo,
      historyRepo,
      mockGitHubService,
      errorLLMService,
      mockNotificationService,
    );

    app.post('/notify', ...handler);

    const res = await app.request('/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        githubPrUrl: 'https://github.com/test/repo/pull/3000',
      }),
    });

    assertEquals(res.status, 500);
    const body = await res.json();
    assertEquals(body.error, 'Internal server error');
  });

  await t.step('通知成功時に新規マニフェストが保存される', async () => {
    const app = new Hono();
    const handler = createManifestoNotifyHandler(
      manifestoRepo,
      historyRepo,
      mockGitHubService,
      mockLLMService,
      mockNotificationService,
    );

    app.post('/notify', ...handler);

    const prUrl = 'https://github.com/test/repo/pull/4000';

    // マニフェストが存在しないことを確認
    const beforeManifesto = await manifestoRepo.findByPrUrl(prUrl);
    assertEquals(beforeManifesto, null);

    const res = await app.request('/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        githubPrUrl: prUrl,
      }),
    });

    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.notifications.x.success, true);

    // マニフェストが保存されたことを確認
    const afterManifesto = await manifestoRepo.findByPrUrl(prUrl);
    assertEquals(afterManifesto?.title, 'テストPR');
    assertEquals(afterManifesto?.summary, 'Mock summary');
    assertEquals(afterManifesto?.githubPrUrl, prUrl);

    // 通知履歴も保存されたことを確認
    const histories = await historyRepo.findAll();
    const savedHistory = histories.find((h) => h.githubPrUrl === prUrl);
    assertEquals(savedHistory?.platform, 'x');
    assertEquals(savedHistory?.postUrl, 'https://x.com/test/status/123');
  });

  kv.close();
});
