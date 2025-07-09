import type { Context } from 'hono';
import type { NotificationHistoryRepository } from '../repositories/notification_history.ts';

export function createNotificationHistoryListHandler(
  historyRepo: NotificationHistoryRepository,
): (c: Context) => Promise<Response> {
  return async (c: Context) => {
    try {
      // クエリパラメータを取得
      const manifestoId = c.req.query('manifestoId');
      const platform = c.req.query('platform');

      let histories;

      if (manifestoId) {
        // マニフェストIDが指定されている場合
        histories = await historyRepo.findByManifesto(manifestoId, platform);
      } else {
        // 全件取得
        histories = await historyRepo.findAll();

        // platformでのフィルタリング
        if (platform) {
          histories = histories.filter((h) => h.platform === platform);
        }
      }

      return c.json({
        histories,
      }, 200);
    } catch (error) {
      console.error('Error listing notification histories:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  };
}
