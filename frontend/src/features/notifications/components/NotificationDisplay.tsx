import { memo } from "react";
import { NotificationDisplayProps } from "../types/notification.types";
import { Notification } from "./Notification";
import { cn } from "@/shared/utils/utils";

export const NotificationDisplay = memo(function NotificationDisplay<T>({
  notifications,
  onDismiss,
  onMarkAsRead,
  maxNotifications = 5,
  className,
}: NotificationDisplayProps<T>) {
  const displayedNotifications = notifications.slice(0, maxNotifications);

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      {displayedNotifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
          onMarkAsRead={onMarkAsRead}
        />
      ))}
    </div>
  );
});
