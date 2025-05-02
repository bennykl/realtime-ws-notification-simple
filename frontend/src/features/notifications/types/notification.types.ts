export type NotificationType = "info" | "success" | "warning" | "error";

export interface BaseNotification<T = any> {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  metadata?: T;
}

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface NotificationProps<T = any> {
  notification: BaseNotification<T>;
  onDismiss: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  actions?: NotificationAction[];
  className?: string;
  style?: React.CSSProperties;
}

export interface NotificationDisplayProps<T = any> {
  notifications: BaseNotification<T>[];
  onDismiss: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  maxNotifications?: number;
  className?: string;
}
