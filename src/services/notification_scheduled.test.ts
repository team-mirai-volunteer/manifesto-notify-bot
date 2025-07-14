import { assertEquals } from '@std/assert';
import { spy } from '@std/testing/mock';
import { createScheduledPostService } from './notification_scheduled.ts';
import { createManifestoRepository } from '../repositories/manifesto.ts';
import { createNotificationHistoryRepository } from '../repositories/notification_history.ts';
import type { Manifesto } from '../types/models/manifesto.ts';

Deno.test('定期ポストサービス', async (t) => {
  await t.step('直近2件しかない場合は通知されず履歴も増えない', async () => {
    const kv = await Deno.openKv(':memory:');
    const manifestoRepo = createManifestoRepository(kv);
    const historyRepo = createNotificationHistoryRepository(kv);

    // 2件の履歴を作成
    const now = new Date();
    await historyRepo.save({
      id: 'history-1',
      manifestoId: 'manifesto-1',
      githubPrUrl: 'https://github.com/test/repo/pull/1',
      platform: 'x',
      postUrl: 'https://x.com/test/1',
      postedAt: new Date(now.getTime() - 60000), // 1分前
    });

    await historyRepo.save({
      id: 'history-2',
      manifestoId: 'manifesto-2',
      githubPrUrl: 'https://github.com/test/repo/pull/2',
      platform: 'x',
      postUrl: 'https://x.com/test/2',
      postedAt: now,
    });

    const mockNotificationService = {
      notify: spy((_text: string) =>
        Promise.resolve({ success: true as const, url: 'https://x.com/test/123' })
      ),
    };

    const service = createScheduledPostService(manifestoRepo, historyRepo, mockNotificationService);
    await service.notify();

    assertEquals(mockNotificationService.notify.calls.length, 0);
    const histories = await historyRepo.findAll();
    assertEquals(histories.length, 2); // 履歴が増えていない

    kv.close();
  });

  await t.step('直近3件しかない場合、その1件が通知され履歴が増える', async () => {
    const kv = await Deno.openKv(':memory:');
    const manifestoRepo = createManifestoRepository(kv);
    const historyRepo = createNotificationHistoryRepository(kv);

    // 3つのマニフェストを作成
    const manifestos: Manifesto[] = [
      {
        id: 'manifesto-1',
        title: 'マニフェスト1',
        summary: '要約1',
        diff: 'diff1',
        githubPrUrl: 'https://github.com/test/repo/pull/1',
        createdAt: new Date(),
      },
      {
        id: 'manifesto-2',
        title: 'マニフェスト2',
        summary: '要約2',
        diff: 'diff2',
        githubPrUrl: 'https://github.com/test/repo/pull/2',
        createdAt: new Date(),
      },
      {
        id: 'manifesto-3',
        title: 'マニフェスト3',
        summary: '要約3',
        diff: 'diff3',
        githubPrUrl: 'https://github.com/test/repo/pull/3',
        createdAt: new Date(),
      },
    ];

    for (const manifesto of manifestos) {
      await manifestoRepo.save(manifesto);
    }

    // 3件の履歴を作成（直近2件はmanifesto-2とmanifesto-3）
    const now = new Date();
    await historyRepo.save({
      id: 'history-1',
      manifestoId: 'manifesto-1',
      githubPrUrl: 'https://github.com/test/repo/pull/1',
      platform: 'x',
      postUrl: 'https://x.com/test/1',
      postedAt: new Date(now.getTime() - 120000), // 2分前
    });

    await historyRepo.save({
      id: 'history-2',
      manifestoId: 'manifesto-2',
      githubPrUrl: 'https://github.com/test/repo/pull/2',
      platform: 'x',
      postUrl: 'https://x.com/test/2',
      postedAt: new Date(now.getTime() - 60000), // 1分前
    });

    await historyRepo.save({
      id: 'history-3',
      manifestoId: 'manifesto-3',
      githubPrUrl: 'https://github.com/test/repo/pull/3',
      platform: 'x',
      postUrl: 'https://x.com/test/3',
      postedAt: now,
    });

    const mockNotificationService = {
      notify: spy((_text: string) =>
        Promise.resolve({ success: true as const, url: 'https://x.com/test/new' })
      ),
    };

    const service = createScheduledPostService(manifestoRepo, historyRepo, mockNotificationService);
    await service.notify();

    // notify が呼ばれたことを確認
    assertEquals(mockNotificationService.notify.calls.length, 1);

    // 渡されたテキストに要約1が含まれることを確認
    const notifyText = mockNotificationService.notify.calls[0].args[0] as string;
    assertEquals(notifyText.includes('要約1'), true);

    const histories = await historyRepo.findAll();
    assertEquals(histories.length, 4); // 履歴が1つ増えている

    kv.close();
  });

  await t.step('直近5件ある場合、3件のうち1つがランダムで通知され履歴が保存される', async () => {
    const kv = await Deno.openKv(':memory:');
    const manifestoRepo = createManifestoRepository(kv);
    const historyRepo = createNotificationHistoryRepository(kv);

    // 5つのマニフェストを作成
    const manifestoIds = [
      'manifesto-1',
      'manifesto-2',
      'manifesto-3',
      'manifesto-4',
      'manifesto-5',
    ];
    for (const id of manifestoIds) {
      await manifestoRepo.save({
        id,
        title: `マニフェスト${id}`,
        summary: `要約${id}`,
        diff: `diff${id}`,
        githubPrUrl: `https://github.com/test/repo/pull/${id}`,
        createdAt: new Date(),
      });
    }

    // 5件の履歴を作成（直近2件はmanifesto-4とmanifesto-5）
    const now = new Date();
    for (let i = 0; i < 5; i++) {
      await historyRepo.save({
        id: `history-${i + 1}`,
        manifestoId: manifestoIds[i],
        githubPrUrl: `https://github.com/test/repo/pull/${manifestoIds[i]}`,
        platform: 'x',
        postUrl: `https://x.com/test/${i + 1}`,
        postedAt: new Date(now.getTime() - (4 - i) * 60000), // 古い順に配置
      });
    }

    const mockNotificationService = {
      notify: spy((_text: string) =>
        Promise.resolve({ success: true as const, url: 'https://x.com/test/new' })
      ),
    };

    const service = createScheduledPostService(manifestoRepo, historyRepo, mockNotificationService);
    await service.notify();

    // notify が呼ばれたことを確認
    assertEquals(mockNotificationService.notify.calls.length, 1);

    // 渡されたテキストに manifesto-1, 2, 3 のいずれかの要約が含まれることを確認
    const notifyText = mockNotificationService.notify.calls[0].args[0] as string;
    const isValidManifesto = notifyText.includes('要約manifesto-1') ||
      notifyText.includes('要約manifesto-2') ||
      notifyText.includes('要約manifesto-3');
    assertEquals(isValidManifesto, true);

    const histories = await historyRepo.findAll();
    assertEquals(histories.length, 6); // 履歴が1つ増えている

    kv.close();
  });

  await t.step('通知が失敗した場合は履歴が保存されない', async () => {
    const kv = await Deno.openKv(':memory:');
    const manifestoRepo = createManifestoRepository(kv);
    const historyRepo = createNotificationHistoryRepository(kv);

    // マニフェストを作成
    await manifestoRepo.save({
      id: 'manifesto-1',
      title: 'マニフェスト1',
      summary: '要約1',
      diff: 'diff1',
      githubPrUrl: 'https://github.com/test/repo/pull/1',
      createdAt: new Date(),
    });

    // 履歴を作成
    await historyRepo.save({
      id: 'history-1',
      manifestoId: 'manifesto-1',
      githubPrUrl: 'https://github.com/test/repo/pull/1',
      platform: 'x',
      postUrl: 'https://x.com/test/1',
      postedAt: new Date(),
    });

    const mockNotificationService = {
      notify: spy((_text: string) =>
        Promise.resolve({
          success: false as const,
          message: 'API rate limit exceeded',
        })
      ),
    };

    const service = createScheduledPostService(manifestoRepo, historyRepo, mockNotificationService);
    await service.notify();

    // notify が呼ばれなかったことを確認（直近2件しかないため）
    assertEquals(mockNotificationService.notify.calls.length, 0);

    const histories = await historyRepo.findAll();
    assertEquals(histories.length, 1); // 履歴が増えていない

    kv.close();
  });
});
