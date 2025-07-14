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

  // SNSが活発な時間帯に定期ポストを実行（朝の通勤時間、昼休み、夕方）
  Deno.cron('scheduled-manifesto-post', '0 8,12,18 * * *', scheduledPostService.notify);

  console.log('✅ Scheduled post cron job registered (at 8:00, 12:00, 18:00 - peak SNS hours)');
}
