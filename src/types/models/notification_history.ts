export type NotificationHistory = {
  id: string;
  manifestoId: string;
  githubPrUrl: string;
  platform: string;
  postUrl?: string;
  postedAt: Date;
  impressions?: number;
  lastUpdatedAt?: Date;
};
