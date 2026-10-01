export type NotificationType = 'ASSIGNMENT' | 'DEADLINE_SOON' | 'OVERDUE' | 'STATUS_CHANGE' | 'SYSTEM';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  emailSent: boolean;
  createdAt: string;
}
