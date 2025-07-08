import { assertEquals, assertExists } from '@std/assert';
import { createNotificationHistoryRepository } from './notification_history.ts';
import type { NotificationHistory } from '../types/models/notification_history.ts';

const TEST_HISTORY: NotificationHistory = {
  id: 'test-notification-123',
  manifestoId: 'test-manifesto-123',
  githubPrUrl: 'https://github.com/team-mirai/policy/pull/1',
  platform: 'x',
  postId: '1234567890',
  postUrl: 'https://x.com/TeamMirai/status/1234567890',
  postedAt: new Date('2024-01-01T00:00:00Z'),
};

Deno.test('通知履歴リポジトリ', async (t) => {
  await t.step('保存', async () => {
    using kv = await Deno.openKv(':memory:');
    const repo = createNotificationHistoryRepository(kv);

    // 保存
    await repo.save(TEST_HISTORY);

    // KVから直接確認
    const saved = await kv.get<NotificationHistory>(['notifications', 'by-id', TEST_HISTORY.id]);
    assertExists(saved.value);
    assertEquals(saved.value, TEST_HISTORY);
  });

  await t.step('マニフェストIDで検索', async () => {
    using kv = await Deno.openKv(':memory:');
    const repo = createNotificationHistoryRepository(kv);

    // 複数の通知履歴を保存
    const histories: NotificationHistory[] = [
      {
        ...TEST_HISTORY,
        id: 'history-1',
        platform: 'x',
      },
      {
        ...TEST_HISTORY,
        id: 'history-2',
        platform: 'slack',
      },
      {
        ...TEST_HISTORY,
        id: 'history-3',
        manifestoId: 'other-manifesto',
        platform: 'x',
      },
    ];

    for (const history of histories) {
      await repo.save(history);
    }

    // マニフェストIDで検索
    const found = await repo.findByManifesto(TEST_HISTORY.manifestoId);
    assertEquals(found.length, 2);
    assertEquals(found[0].manifestoId, TEST_HISTORY.manifestoId);
    assertEquals(found[1].manifestoId, TEST_HISTORY.manifestoId);
  });

  await t.step('プラットフォームでフィルタ', async () => {
    using kv = await Deno.openKv(':memory:');
    const repo = createNotificationHistoryRepository(kv);

    // 複数の通知履歴を保存
    const histories: NotificationHistory[] = [
      {
        ...TEST_HISTORY,
        id: 'history-1',
        platform: 'x',
      },
      {
        ...TEST_HISTORY,
        id: 'history-2',
        platform: 'slack',
      },
    ];

    for (const history of histories) {
      await repo.save(history);
    }

    // プラットフォームでフィルタ
    const found = await repo.findByManifesto(TEST_HISTORY.manifestoId, 'x');
    assertEquals(found.length, 1);
    assertEquals(found[0].platform, 'x');
  });

});
