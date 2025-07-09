import { XClient } from '../repositories/x.ts';
import type { NotificationResult, NotificationService } from './notification.ts';

export type XNotificationConfig = {
  apiKey: string;
  apiKeySecret: string;
  accessToken: string;
  accessTokenSecret: string;
};

export function createXNotificationService(client: XClient): NotificationService {
  return {
    async notify(title: string, content: string): Promise<NotificationResult> {
      try {
        // タイトルと内容を結合
        let text = `${title}\n\n${content}`;

        // 280文字を超える場合は切り詰める
        if (text.length > 130) {
          text = text.substring(0, 130) + '...';
        }

        const post = await client.tweet(text);

        return {
          success: true,
          url: `https://x.com/mirai_manifesto/status/${post.data.id}`,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to post to X: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        };
      }
    },
  };
}
