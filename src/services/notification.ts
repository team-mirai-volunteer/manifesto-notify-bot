export type NotificationResult = {
  success: true;
  url: string;
} | {
  success: false;
  message: string;
};

export type NotificationService = {
  notify(title: string, content: string): Promise<NotificationResult>;
};
