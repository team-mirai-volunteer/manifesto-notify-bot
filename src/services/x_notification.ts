import type { NotificationResult, NotificationService } from './notification.ts';

export type XNotificationConfig = {
  apiKey: string;
  apiKeySecret: string;
  accessToken: string;
  accessTokenSecret: string;
  fetchFn?: typeof fetch;
};

export function createXNotificationService(config: XNotificationConfig): NotificationService {
  const { fetchFn = fetch } = config;

  return {
    async notify(title: string, content: string): Promise<NotificationResult> {
      try {
        // タイトルと内容を結合
        let text = `${title}\n\n${content}`;

        // 280文字を超える場合は切り詰める
        if (text.length > 280) {
          text = text.substring(0, 277) + '...';
        }

        // 実際のX API v2では、OAuth 2.0 Bearer TokenまたはOAuth 1.0a署名が必要
        // 本番実装では、適切な認証ライブラリを使用すること
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.accessToken}`,
        };

        const response = await fetchFn('https://api.twitter.com/2/tweets', {
          method: 'POST',
          headers,
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          throw new Error(`X API error: ${response.status}`);
        }

        const data = await response.json();
        const tweetId = data.data.id;

        return {
          success: true,
          url: `https://x.com/TeamMirai/status/${tweetId}`,
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

    getPlatformName(): string {
      return 'x';
    },
  };
}
