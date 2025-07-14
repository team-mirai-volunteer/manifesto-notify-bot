import { assertEquals } from '@std/assert';
import { spy } from '@std/testing/mock';
import { importMergedPR, validatePRUrl } from './import_merged_pr.ts';
import { createGitHubService } from '../services/github.ts';
import { createLLMService } from '../services/llm.ts';
import { createManifestoRepository } from '../repositories/manifesto.ts';
import { createNotificationHistoryRepository } from '../repositories/notification_history.ts';
import type { Manifesto } from '../types/models/manifesto.ts';
import type { NotificationHistory } from '../types/models/notification_history.ts';

Deno.test('import_merged_pr', async (t) => {
  await t.step('validatePRUrl', async (t) => {
    await t.step('有効なPR URLを受け入れる', () => {
      assertEquals(validatePRUrl('https://github.com/owner/repo/pull/123'), true);
      assertEquals(validatePRUrl('https://github.com/team-mirai/policy/pull/1'), true);
      assertEquals(validatePRUrl('https://github.com/a-b/c_d/pull/999'), true);
    });

    await t.step('無効なPR URLを拒否する', () => {
      assertEquals(validatePRUrl('https://github.com/owner/repo/issues/123'), false);
      assertEquals(validatePRUrl('https://github.com/owner/repo'), false);
      assertEquals(validatePRUrl('https://example.com/pull/123'), false);
      assertEquals(validatePRUrl('not-a-url'), false);
      assertEquals(validatePRUrl(''), false);
    });
  });

  await t.step('importMergedPR', async (t) => {
    await t.step('マージ済みPRからマニフェストと履歴を作成', async () => {
      const kv = await Deno.openKv(':memory:');

      // モックデータ
      const mockDiff = 'diff --git a/test.md b/test.md\n+追加行';
      const mockSummary = 'テスト要約';

      const mockPR = {
        title: 'テストPR',
        body: 'テスト本文',
        diff: mockDiff,
      };

      // モックサービス
      const mockGitHubService = {
        getPullRequest: spy(() => Promise.resolve(mockPR)),
      };

      const mockLLMService = {
        generateSummary: spy(() => Promise.resolve(mockSummary)),
      };

      const manifestoData: Manifesto[] = [];
      const historyData: NotificationHistory[] = [];

      const mockManifestoRepo = {
        findByPrUrl: spy(() => Promise.resolve(null)),
        save: spy((manifesto: Manifesto) => {
          manifestoData.push(manifesto);
          return Promise.resolve();
        }),
        findById: spy(() => Promise.resolve(null)),
        findAll: spy(() => Promise.resolve([])),
      };

      const mockHistoryRepo = {
        findByManifesto: spy(() => Promise.resolve([])),
        save: spy((history: NotificationHistory) => {
          historyData.push(history);
          return Promise.resolve();
        }),
        findAll: spy(() => Promise.resolve([])),
        findByPrUrl: spy(() => Promise.resolve([])),
      };

      const result = await importMergedPR({
        prUrl: 'https://github.com/test/repo/pull/1',
        // @ts-ignore: モックのため型は部分的に一致
        githubService: mockGitHubService,
        // @ts-ignore: モックのため型は部分的に一致
        llmService: mockLLMService,
        // @ts-ignore: モックのため型は部分的に一致
        manifestoRepo: mockManifestoRepo,
        // @ts-ignore: モックのため型は部分的に一致
        historyRepo: mockHistoryRepo,
      });

      // 結果を確認
      assertEquals(result.success, true);
      assertEquals(result.title, 'テストPR');
      assertEquals(result.summary, 'テスト要約');
      // postedAtは現在時刻なので、型チェックのみ
      assertEquals(result.postedAt instanceof Date, true);

      // マニフェストが保存されたことを確認
      assertEquals(manifestoData.length, 1);
      assertEquals(manifestoData[0].title, 'テストPR');
      assertEquals(manifestoData[0].summary, 'テスト要約');
      assertEquals(manifestoData[0].diff, mockDiff);

      // 履歴が保存されたことを確認
      assertEquals(historyData.length, 1);
      assertEquals(historyData[0].manifestoId, manifestoData[0].id);
      assertEquals(historyData[0].platform, 'x');
      assertEquals(historyData[0].postUrl, '');

      kv.close();
    });

    await t.step('既存のマニフェストと履歴がある場合はスキップ', async () => {
      const kv = await Deno.openKv(':memory:');

      const existingManifesto = {
        id: 'existing-id',
        title: '既存PR',
        summary: '既存要約',
        diff: '既存diff',
        githubPrUrl: 'https://github.com/test/repo/pull/1',
        createdAt: new Date('2023-12-01'),
      };

      const existingHistory = {
        id: 'history-id',
        manifestoId: 'existing-id',
        githubPrUrl: 'https://github.com/test/repo/pull/1',
        platform: 'x' as const,
        postUrl: '',
        postedAt: new Date('2023-12-01'),
      };

      const mockManifestoRepo = {
        findByPrUrl: spy(() => Promise.resolve(existingManifesto)),
        save: spy(() => Promise.resolve()),
        findById: spy(() => Promise.resolve(null)),
        findAll: spy(() => Promise.resolve([])),
      };

      const mockHistoryRepo = {
        findByManifesto: spy(() => Promise.resolve([existingHistory])),
        save: spy(() => Promise.resolve()),
        findAll: spy(() => Promise.resolve([])),
        findByPrUrl: spy(() => Promise.resolve([])),
      };

      const result = await importMergedPR({
        prUrl: 'https://github.com/test/repo/pull/1',
        // @ts-ignore: モックのため型は部分的に一致
        githubService: createGitHubService(fetch, 'test-token'),
        // @ts-ignore: モックのため型は部分的に一致
        llmService: createLLMService(false),
        // @ts-ignore: モックのため型は部分的に一致
        manifestoRepo: mockManifestoRepo,
        // @ts-ignore: モックのため型は部分的に一致
        historyRepo: mockHistoryRepo,
      });

      // スキップされたことを確認
      assertEquals(result.success, false);
      assertEquals(result.message, 'Manifesto and history already exist');
      assertEquals(result.manifestoId, 'existing-id');

      // saveが呼ばれていないことを確認
      assertEquals(mockManifestoRepo.save.calls.length, 0);
      assertEquals(mockHistoryRepo.save.calls.length, 0);

      kv.close();
    });

    await t.step('マージされていないPRの場合はエラー', async () => {
      const kv = await Deno.openKv(':memory:');

      // PR情報は取得できるが、要約生成時にエラーを投げる
      const unmergedPR = {
        title: '未マージPR',
        body: '本文',
        diff: '',
      };

      const mockGitHubService = {
        getPullRequest: spy(() => Promise.resolve(unmergedPR)),
      };

      const mockLLMService = {
        generateSummary: spy(() => {
          throw new Error('This PR is not merged yet');
        }),
      };

      try {
        await importMergedPR({
          prUrl: 'https://github.com/test/repo/pull/1',
          // @ts-ignore: モックのため型は部分的に一致
          githubService: mockGitHubService,
          // @ts-ignore: モックのため型は部分的に一致
          llmService: mockLLMService,
          // @ts-ignore: モックのため型は部分的に一致
          manifestoRepo: createManifestoRepository(kv),
          // @ts-ignore: モックのため型は部分的に一致
          historyRepo: createNotificationHistoryRepository(kv),
        });

        // エラーが発生するはず
        throw new Error('Should have thrown an error');
      } catch (error) {
        assertEquals((error as Error).message, 'This PR is not merged yet');
      } finally {
        kv.close();
      }
    });
  });
});
