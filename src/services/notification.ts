export type NotificationResult = {
  success: true;
  url: string;
} | {
  success: false;
  message: string;
};

export type NotificationService = {
  notify(text: string): Promise<NotificationResult>;
};
