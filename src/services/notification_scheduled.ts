import type { NotificationHistoryRepository } from '../repositories/notification_history.ts';
import type { ManifestoRepository } from '../repositories/manifesto.ts';
import type { NotificationService } from './notification.ts';

export function createScheduledPostService(
  manifestoRepo: ManifestoRepository,
  historyRepo: NotificationHistoryRepository,
  notificationService: NotificationService,
) {
  return {
    async notify(): Promise<void> {
      console.log('[Scheduled Post] Starting scheduled manifesto post...');

      try {
        const allHistories = await historyRepo.findAll();

        if (allHistories.length === 0) {
          console.log('[Scheduled Post] No notification history found. Skipping.');
          return;
        }

        // 直近2つの投稿を除外するために履歴を投稿日時でソート
        const sortedHistories = allHistories
          .sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());

        const recentManifestoIds = new Set(
          sortedHistories
            .slice(0, 2)
            .map((h) => h.manifestoId),
        );

        // 投稿可能なマニフェストIDを抽出（重複を除去し、直近2つを除外）
        const allManifestoIds = [...new Set(allHistories.map((h) => h.manifestoId))];
        const availableManifestoIds = allManifestoIds.filter(
          (id) => !recentManifestoIds.has(id),
        );

        if (availableManifestoIds.length === 0) {
          console.log(
            '[Scheduled Post] No available manifestos (all are in recent 2 posts). Skipping.',
          );
          return;
        }

        // 利用可能なマニフェストIDをシャッフル
        const shuffled = [...availableManifestoIds];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // シャッフルした配列から最初の1つを選択
        const selectedManifestoId = shuffled[0];

        // マニフェストを取得
        const manifesto = await manifestoRepo.findById(selectedManifestoId);

        if (!manifesto) {
          console.error(`[Scheduled Post] Manifesto not found: ${selectedManifestoId}`);
          return;
        }

        console.log(`[Scheduled Post] Selected manifesto: ${manifesto.title}`);

        const text = `
⏳マニフェストの進化の歴史をご紹介⏳
${manifesto.createdAt.getMonth() + 1}/${manifesto.createdAt.getDate()}: ${manifesto.summary}
${manifesto.githubPrUrl}
`;

        // 通知を送信
        const result = await notificationService.notify(text);

        if (result.success) {
          // 通知履歴を保存
          await historyRepo.save({
            id: crypto.randomUUID(),
            manifestoId: manifesto.id,
            githubPrUrl: manifesto.githubPrUrl,
            platform: 'x',
            postUrl: result.url,
            postedAt: new Date(),
          });

          console.log(
            `[Scheduled Post] Successfully posted: ${manifesto.title}, URL: ${result.url}`,
          );
        } else {
          console.error('[Scheduled Post] Failed to send notification:', result.message);
        }
      } catch (error) {
        console.error('[Scheduled Post] Error during scheduled post:', error);
      }
    },
  };
}
