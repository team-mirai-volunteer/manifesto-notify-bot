import { TwitterApi } from 'npm:twitter-api-v2';
import type { NotificationResult, NotificationService } from './notification.ts';

export type XNotificationConfig = {
  apiKey: string;
  apiKeySecret: string;
  accessToken: string;
  accessTokenSecret: string;
};

export function createXNotificationService(config: XNotificationConfig): NotificationService {
  const client = new TwitterApi({
    appKey: config.apiKey,
    appSecret: config.apiKeySecret,
    accessToken: config.accessToken,
    accessSecret: config.accessTokenSecret,
  });

  return {
    async notify(title: string, content: string): Promise<NotificationResult> {
      try {
        // タイトルと内容を結合
        let text = `${title}\n\n${content}`;

        // 280文字を超える場合は切り詰める
        if (text.length > 130) {
          text = text.substring(0, 130) + '...';
        }

        const tweet = await client.v2.tweet(text);

        return {
          success: true,
          url: `https://x.com/mirai_manifesto/status/${tweet.data.id}`,
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
