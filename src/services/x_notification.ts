import { XClient } from '../repositories/x.ts';
import type { NotificationResult, NotificationService } from './notification.ts';
import { Manifesto } from '../types/models/manifesto.ts';

export type XNotificationConfig = {
  apiKey: string;
  apiKeySecret: string;
  accessToken: string;
  accessTokenSecret: string;
};

export function createXNotificationService(client: XClient): NotificationService {
  return {
    async notify(manifesto: Manifesto): Promise<NotificationResult> {
      try {
        const text = `
皆様の政策提案がマニフェストに取り込まれました🎉

✅ 要約: ${manifesto.summary}
📝 詳細: ${manifesto.githubPrUrl}

ご提案ありがとうございました🙇‍♂️
引き続き皆様の政策提案、お待ちしております😊
`;

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
