import { assertEquals } from '@std/assert';
import { Hono } from 'hono';
import { createNotificationHistoryListHandler } from './notification_history_list.ts';
import { createNotificationHistoryRepository } from '../repositories/notification_history.ts';
import type { NotificationHistory } from '../types/models/notification_history.ts';

Deno.test('通知履歴一覧取得ハンドラー', async (t) => {
  await t.step('全ての通知履歴を取得できる', async () => {
    const kv = await Deno.openKv(':memory:');
    const historyRepo = createNotificationHistoryRepository(kv);

    // テストデータを準備
    const histories: NotificationHistory[] = [
      {
        id: 'history-1',
        manifestoId: 'manifesto-1',
        githubPrUrl: 'https://github.com/test/repo/pull/1',
        platform: 'x',
        postUrl: 'https://x.com/test/status/1',
        postedAt: new Date('2024-01-01T00:00:00Z'),
      },
      {
        id: 'history-2',
        manifestoId: 'manifesto-2',
        githubPrUrl: 'https://github.com/test/repo/pull/2',
        platform: 'x',
        postUrl: 'https://x.com/test/status/2',
        postedAt: new Date('2024-01-02T00:00:00Z'),
      },
    ];

    // データを保存
    for (const history of histories) {
      await historyRepo.save(history);
    }

    // ハンドラーを作成
    const app = new Hono();
    const handler = createNotificationHistoryListHandler(historyRepo);
    app.get('/histories', handler);

    // リクエストを送信
    const res = await app.request('/histories', {
      method: 'GET',
    });

    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.histories.length, 2);
    assertEquals(body.histories[0].id, 'history-1');
    assertEquals(body.histories[1].id, 'history-2');

    kv.close();
  });

  await t.step('manifestoIdでフィルタリングできる', async () => {
    const kv = await Deno.openKv(':memory:');
    const historyRepo = createNotificationHistoryRepository(kv);

    // テストデータを準備
    const histories: NotificationHistory[] = [
      {
        id: 'history-1',
        manifestoId: 'manifesto-1',
        githubPrUrl: 'https://github.com/test/repo/pull/1',
        platform: 'x',
        postUrl: 'https://x.com/test/status/1',
        postedAt: new Date('2024-01-01T00:00:00Z'),
      },
      {
        id: 'history-2',
        manifestoId: 'manifesto-1',
        githubPrUrl: 'https://github.com/test/repo/pull/1',
        platform: 'x',
        postUrl: 'https://x.com/test/status/2',
        postedAt: new Date('2024-01-02T00:00:00Z'),
      },
      {
        id: 'history-3',
        manifestoId: 'manifesto-2',
        githubPrUrl: 'https://github.com/test/repo/pull/2',
        platform: 'x',
        postUrl: 'https://x.com/test/status/3',
        postedAt: new Date('2024-01-03T00:00:00Z'),
      },
    ];

    // データを保存
    for (const history of histories) {
      await historyRepo.save(history);
    }

    // ハンドラーを作成
    const app = new Hono();
    const handler = createNotificationHistoryListHandler(historyRepo);
    app.get('/histories', handler);

    // manifestoIdでフィルタリング
    const res = await app.request('/histories?manifestoId=manifesto-1', {
      method: 'GET',
    });

    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.histories.length, 2);
    assertEquals(body.histories[0].manifestoId, 'manifesto-1');
    assertEquals(body.histories[1].manifestoId, 'manifesto-1');

    kv.close();
  });

  await t.step('platformでフィルタリングできる', async () => {
    const kv = await Deno.openKv(':memory:');
    const historyRepo = createNotificationHistoryRepository(kv);

    // 現在はxのみ対応なので、このテストは将来のための準備
    const histories: NotificationHistory[] = [
      {
        id: 'history-1',
        manifestoId: 'manifesto-1',
        githubPrUrl: 'https://github.com/test/repo/pull/1',
        platform: 'x',
        postUrl: 'https://x.com/test/status/1',
        postedAt: new Date('2024-01-01T00:00:00Z'),
      },
    ];

    // データを保存
    for (const history of histories) {
      await historyRepo.save(history);
    }

    // ハンドラーを作成
    const app = new Hono();
    const handler = createNotificationHistoryListHandler(historyRepo);
    app.get('/histories', handler);

    // platformでフィルタリング
    const res = await app.request('/histories?platform=x', {
      method: 'GET',
    });

    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.histories.length, 1);
    assertEquals(body.histories[0].platform, 'x');

    kv.close();
  });

  await t.step('通知履歴が存在しない場合は空配列を返す', async () => {
    const kv = await Deno.openKv(':memory:');
    const historyRepo = createNotificationHistoryRepository(kv);

    // ハンドラーを作成
    const app = new Hono();
    const handler = createNotificationHistoryListHandler(historyRepo);
    app.get('/histories', handler);

    // リクエストを送信
    const res = await app.request('/histories', {
      method: 'GET',
    });

    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.histories.length, 0);

    kv.close();
  });
});
