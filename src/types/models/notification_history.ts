export type NotificationHistory = {
  id: string;
  manifestoId: string;
  githubPrUrl: string;
  platform: string;
  postId: string;
  postUrl?: string;
  postedAt: Date;
  impressions?: number;
  lastUpdatedAt?: Date;
};
