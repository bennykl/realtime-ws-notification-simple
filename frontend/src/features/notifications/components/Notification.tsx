import { useState, useEffect, memo } from "react";
import { cn } from "@/shared/utils/utils";
import { NotificationProps } from "../types/notification.types";

export const Notification = memo(function Notification<T>({
  notification,
  onDismiss,
  onMarkAsRead,
  actions = [],
  className,
  style,
}: NotificationProps<T>) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss(notification.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss(notification.id);
  };

  const handleMarkAsRead = () => {
    onMarkAsRead(notification.id);
  };

  return (
    <div
      className={cn(
        "relative p-4 mb-2 rounded-lg shadow-md transition-all duration-300",
        "bg-white dark:bg-gray-800",
        notification.read ? "opacity-75" : "opacity-100",
        {
          "border-l-4 border-blue-500": notification.type === "info",
          "border-l-4 border-green-500": notification.type === "success",
          "border-l-4 border-yellow-500": notification.type === "warning",
          "border-l-4 border-red-500": notification.type === "error",
        },
        className
      )}
      style={style}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {notification.title}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {notification.message}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {new Date(notification.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {!notification.read && (
            <button
              onClick={handleMarkAsRead}
              className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Mark as read
            </button>
          )}
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {action.label}
            </button>
          ))}
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
          >
            <span className="sr-only">Dismiss</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});
