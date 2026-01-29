import { TwitterApi } from 'twitter-api-v2';
import { config } from '../config.ts';

type PostResult = {
  data: {
    id: string;
    text: string;
  };
};

export type XClient = {
  tweet: (text: string) => Promise<PostResult>;
};

export function createXClient(): XClient {
  if (config.isProd()) {
    const xApiKey = Deno.env.get('X_API_KEY');
    const xApiKeySecret = Deno.env.get('X_API_KEY_SECRET');
    const xAccessToken = Deno.env.get('X_ACCESS_TOKEN');
    const xAccessTokenSecret = Deno.env.get('X_ACCESS_TOKEN_SECRET');

    if (!xApiKey || !xApiKeySecret || !xAccessToken || !xAccessTokenSecret) {
      throw new Error(
        'X API credentials are required (X_API_KEY, X_API_KEY_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET)',
      );
    }

    const x = new TwitterApi({
      appKey: xApiKey,
      appSecret: xApiKeySecret,
      accessToken: xAccessToken,
      accessSecret: xAccessTokenSecret,
    });

    return {
      tweet: async (text: string): Promise<PostResult> => {
        try {
          const post = await x.v2.tweet(text);
          return post;
        } catch (error) {
          throw new Error(
            `Failed to post to X: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      },
    };
  }

  return {
    tweet: (text: string): Promise<PostResult> => {
      return Promise.resolve({
        data: {
          id: '1942491313124851933', // モック用のID
          text,
        },
      });
    },
  };
}
