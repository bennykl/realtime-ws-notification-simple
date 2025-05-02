import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { WS_EVENTS } from "@/core/constants/websocket";
import { Notification } from "@/core/types/notification.types";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";

interface NotificationContextType {
  notifications: Notification[];
  isConnected: boolean;
  connectionState: string;
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
}

interface WebSocketError {
  message: string;
  code?: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({
  children,
}: NotificationProviderProps): JSX.Element => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { wsManager, connectionState } = useAuthStore();

  useEffect(() => {
    if (!wsManager) return;

    const handleNotification = (data: Notification): void => {
      console.log("NotificationProvider: Received notification", {
        notificationId: data.id,
        title: data.title,
        message: data.message,
        currentNotificationsCount: notifications.length,
        connectionState: wsManager.getState(),
        isConnected: wsManager.isConnected(),
      });

      const newNotification: Notification = {
        id: data.id,
        title: data.title,
        message: data.message,
        priority: data.priority || "info",
        topic: data.topic,
        timestamp: Date.now(),
      };

      setNotifications((prev) => [...prev, newNotification]);
      showToast(newNotification);
    };

    const handleError = (error: WebSocketError): void => {
      console.error("NotificationProvider: WebSocket error", {
        error,
        connectionState: wsManager.getState(),
      });
      toast.error("Connection error occurred");
    };

    const handleServerError = (error: WebSocketError): void => {
      console.error("NotificationProvider: Server error", {
        error,
        connectionState: wsManager.getState(),
      });
      toast.error("Server error occurred");
    };

    const handleReconnectFailed = (): void => {
      console.error("NotificationProvider: Reconnect failed", {
        connectionState: wsManager.getState(),
      });
      toast.error("Failed to reconnect to server");
    };

    // Register event handlers
    wsManager.on(WS_EVENTS.NOTIFICATION, handleNotification);
    wsManager.on(WS_EVENTS.ERROR, handleError);
    wsManager.on(WS_EVENTS.SERVER_ERROR, handleServerError);
    wsManager.on(WS_EVENTS.RECONNECT_FAILED, handleReconnectFailed);

    return () => {
      wsManager.off(WS_EVENTS.NOTIFICATION, handleNotification);
      wsManager.off(WS_EVENTS.ERROR, handleError);
      wsManager.off(WS_EVENTS.SERVER_ERROR, handleServerError);
      wsManager.off(WS_EVENTS.RECONNECT_FAILED, handleReconnectFailed);
    };
  }, [wsManager, notifications.length]);

  const addNotification = (notification: Notification): void => {
    console.log("NotificationProvider: Adding notification", {
      notificationId: notification.id,
      title: notification.title,
      currentNotificationsCount: notifications.length,
      connectionState: wsManager?.getState(),
      isConnected: wsManager?.isConnected(),
    });
    setNotifications((prev) => [...prev, notification]);
  };

  const clearNotifications = (): void => {
    console.log("NotificationProvider: Clearing notifications", {
      previousCount: notifications.length,
      connectionState: wsManager?.getState(),
    });
    setNotifications([]);
  };

  const showToast = (notification: Notification): void => {
    if (notification.priority === "info") {
      toast(notification.title, {
        description: notification.message,
      });
    } else {
      toast.error(notification.title, {
        description: notification.message,
      });
    }
  };

  const value: NotificationContextType = {
    notifications,
    isConnected: wsManager?.isConnected() || false,
    connectionState,
    addNotification,
    clearNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
