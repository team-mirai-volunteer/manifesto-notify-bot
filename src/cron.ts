import { createManifestoRepository } from './repositories/manifesto.ts';
import { createNotificationHistoryRepository } from './repositories/notification_history.ts';
import { createXNotificationService } from './services/x_notification.ts';
import { createXClient } from './repositories/x.ts';
import { createScheduledPostService } from './services/notification_scheduled.ts';
import { config } from './config.ts';

export async function registerCronJobs() {
  if (!config.isProd()) {
    console.log('Skipping cron job registration in non-production environment');
    return;
  }

  const kv = await Deno.openKv();
  const manifestoRepo = createManifestoRepository(kv);
  const historyRepo = createNotificationHistoryRepository(kv);
  const xClient = createXClient();
  const notificationService = createXNotificationService(xClient);

  const scheduledPostService = createScheduledPostService(
    manifestoRepo,
    historyRepo,
    notificationService,
  );

  // 1時間ごとに定期ポストを実行（毎時0分）
  Deno.cron('scheduled-manifesto-post', '0 * * * *', scheduledPostService.notify);

  console.log('✅ Scheduled post cron job registered (every hour at :00)');
}
