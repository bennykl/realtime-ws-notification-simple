export type NotificationPriority = "info" | "error";

export interface Notification {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  topic: string;
  timestamp: number;
}

export interface NotificationFormData {
  title: string;
  message: string;
  priority: NotificationPriority;
  topic: string;
}
