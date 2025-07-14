import { Manifesto } from '../types/models/manifesto.ts';

export type NotificationResult = {
  success: true;
  url: string;
} | {
  success: false;
  message: string;
};

export type NotificationService = {
  notify(manifesto: Manifesto): Promise<NotificationResult>;
};
