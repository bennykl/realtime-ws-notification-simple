import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { useWebSocket } from "@/features/notifications/hooks/useWebSocket";
import { WS_EVENTS } from "@/features/notifications/core/constants";
import { toast } from "sonner";
import { WebSocketOptions } from "@/features/notifications/core/WebSocketManager";

interface Notification {
  id: string;
  type: "info" | "error";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  isConnected: boolean;
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
  markAsRead: (id: string) => void;
  showNotification: (notification: {
    title: string;
    description: string;
    type: "info" | "error";
  }) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = () => {
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
}: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const wsOptions: WebSocketOptions = {
    url: `ws://localhost:8000/api/ws/notification`,
    autoConnect: true,
    autoReconnect: true,
    debug: true,
    heartbeatInterval: 30000,
    authToken:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTkwMzgwMDMyMX0._0t7obb9zgR7SL3vveehyjaOBKbVQKGpZ9aRZ2NiqvE",
  };

  const { on, off, isConnected: wsIsConnected } = useWebSocket(wsOptions);

  useEffect(() => {
    on(WS_EVENTS.NOTIFICATION, handleNotification);
    on(WS_EVENTS.ERROR, handleError);

    return () => {
      off(WS_EVENTS.NOTIFICATION, handleNotification);
      off(WS_EVENTS.ERROR, handleError);
    };
  }, [on, off]);

  const handleNotification = (data: any) => {
    const notification: Notification = {
      id: data.id,
      type: data.type,
      title: data.title,
      message: data.message,
      timestamp: Date.now(),
      read: false,
    };
    addNotification(notification);
    showNotification({
      title: data.title,
      description: data.message,
      type: data.type,
    });
  };

  const handleError = (error: any) => {
    console.error("WebSocket error:", error);
  };

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [...prev, notification]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const showNotification = ({
    title,
    description,
    type,
  }: {
    title: string;
    description: string;
    type: "info" | "error";
  }) => {
    if (type === "info") {
      toast(title, {
        description,
      });
    } else {
      toast.error(title, {
        description,
      });
    }
  };

  const value = {
    notifications,
    isConnected: wsIsConnected(),
    addNotification,
    clearNotifications,
    markAsRead,
    showNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
