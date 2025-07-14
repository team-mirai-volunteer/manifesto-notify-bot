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

        let manifesto = await manifestoRepo.findByPrUrl(validInput.githubPrUrl);

        let isNew = false;
        if (!manifesto) {
          isNew = true;

          const pr = await githubService.getPullRequest(validInput.githubPrUrl);
          const summary = await llmService.generateSummary(pr);

          manifesto = {
            id: crypto.randomUUID(),
            title: pr.title,
            summary,
            diff: pr.diff,
            githubPrUrl: validInput.githubPrUrl,
            createdAt: new Date(),
          };
          if (manifesto.summary.includes('要約対象外')) {
            const message = 'This PR is not suitable for notification.';
            console.log(message);
            return c.json({ message }, 200);
          }
        }

        const text = `
皆様の政策提案がマニフェストに取り込まれました🎉

✅ 要約: ${manifesto.summary}
📝 詳細: ${manifesto.githubPrUrl}

ご提案ありがとうございました🙇‍♂️
引き続き皆様の政策提案、お待ちしております😊
`;

        const result = await notificationService.notify(text);

        if (result.success) {
          if (isNew) {
            await manifestoRepo.save(manifesto);
            console.log('New manifesto created:', manifesto.id);
          }

          const history: NotificationHistory = {
            id: crypto.randomUUID(),
            manifestoId: manifesto.id,
            githubPrUrl: manifesto.githubPrUrl,
            platform: 'x', // 現在はXのみ対応
            postUrl: result.url,
            postedAt: new Date(),
          };

          await historyRepo.save(history);
          console.log('Notification history saved:', history);
        }

        return c.json({
          manifestoId: manifesto.id,
          notifications: {
            x: result,
          },
        }, 200);
      } catch (error) {
        console.error('Error notifying manifesto:', error);
        return c.json({ error: 'Internal server error' }, 500);
      }
    },
  ];
}
