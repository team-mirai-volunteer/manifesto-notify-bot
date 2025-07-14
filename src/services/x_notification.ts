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
    async notify(text: string): Promise<NotificationResult> {
      try {
        const post = await client.tweet(text);
        console.log(`Posted to X:` + JSON.stringify(post));

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
