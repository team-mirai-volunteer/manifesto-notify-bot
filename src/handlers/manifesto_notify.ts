import type { Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { ManifestoRepository } from '../repositories/manifesto.ts';
import type { NotificationHistoryRepository } from '../repositories/notification_history.ts';
import type { GitHubService } from '../services/github.ts';
import type { LLMService } from '../services/llm.ts';
import type { NotificationService } from '../services/notification.ts';
import type { NotificationHistory } from '../types/models/notification_history.ts';

const notifyManifestoSchema = z.object({
  githubPrUrl: z.string()
    .min(1, 'GitHub PR URL is required')
    .regex(
      /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+$/,
      'GitHub PR URL must be in the format: https://github.com/owner/repo/pull/123',
    ),
});

type NotifyManifestoInput = z.infer<typeof notifyManifestoSchema>;

const notifyManifestoValidator = zValidator('json', notifyManifestoSchema);

export function createManifestoNotifyHandler(
  manifestoRepo: ManifestoRepository,
  historyRepo: NotificationHistoryRepository,
  githubService: GitHubService,
  llmService: LLMService,
  notificationService: NotificationService,
): [typeof notifyManifestoValidator, (c: Context) => Promise<Response>] {
  return [
    notifyManifestoValidator,
    async (c: Context) => {
      try {
        const validInput = await c.req.json<NotifyManifestoInput>();

        // PR URLでマニフェストを検索
        let manifesto = await manifestoRepo.findByPrUrl(validInput.githubPrUrl);

        // 存在しない場合は新規作成
        if (!manifesto) {
          const prData = await githubService.getPullRequest(validInput.githubPrUrl);
          const summary = await llmService.generateSummary(prData.diff);

          manifesto = {
            id: crypto.randomUUID(),
            title: prData.title,
            summary,
            content: prData.diff,
            githubPrUrl: validInput.githubPrUrl,
            createdAt: new Date(),
          };

          await manifestoRepo.save(manifesto);
        }

        // X（Twitter）に通知
        const result = await notificationService.notify(manifesto.title, manifesto.summary);

        // 通知履歴を保存
        const history: NotificationHistory = {
          id: crypto.randomUUID(),
          manifestoId: manifesto.id,
          githubPrUrl: manifesto.githubPrUrl,
          platform: 'x', // 現在はXのみ対応
          postUrl: result.url,
          postedAt: new Date(),
        };

        await historyRepo.save(history);

        return c.json({
          success: true,
          manifestoId: manifesto.id,
        }, 200);
      } catch (error) {
        console.error('Error notifying manifesto:', error);
        return c.json({ error: 'Internal server error' }, 500);
      }
    },
  ];
}
