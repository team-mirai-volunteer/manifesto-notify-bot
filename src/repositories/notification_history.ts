import type { NotificationHistory } from '../types/models/notification_history.ts';

export type NotificationHistoryRepository = {
  save(history: NotificationHistory): Promise<void>;
  findByManifesto(manifestoId: string, platform?: string): Promise<NotificationHistory[]>;
};

export function createNotificationHistoryRepository(kv: Deno.Kv): NotificationHistoryRepository {
  return {
    async save(history: NotificationHistory): Promise<void> {
      const atomic = kv.atomic();
      // IDでの保存
      atomic.set(['notifications', 'by-id', history.id], history);
      // マニフェストIDとプラットフォームでの検索用キー
      atomic.set(
        ['notifications', 'by-manifesto', history.manifestoId, history.platform, history.id],
        history,
      );
      await atomic.commit();
    },

    async findByManifesto(manifestoId: string, platform?: string): Promise<NotificationHistory[]> {
      const histories: NotificationHistory[] = [];
      const prefix = platform
        ? ['notifications', 'by-manifesto', manifestoId, platform]
        : ['notifications', 'by-manifesto', manifestoId];

      for await (const entry of kv.list<NotificationHistory>({ prefix })) {
        histories.push(entry.value);
      }

      return histories;
    },
  };
}
