export type NotificationResult = {
  success: boolean;
  message?: string;
  url?: string;
};

export type NotificationService = {
  notify(title: string, content: string): Promise<NotificationResult>;
  getPlatformName(): string;
};
