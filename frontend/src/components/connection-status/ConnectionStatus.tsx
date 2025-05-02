import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { CONNECTION_STATES } from "@/core/constants/websocket";

export const ConnectionStatus = () => {
  const { connectionState } = useAuthStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show status when disconnected or reconnecting
    if (
      connectionState === CONNECTION_STATES.DISCONNECTED ||
      connectionState === CONNECTION_STATES.RECONNECTING
    ) {
      setIsVisible(true);
    } else {
      // Hide after a delay when connected
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [connectionState]);

  if (!isVisible) return null;

  const getStatusMessage = () => {
    switch (connectionState) {
      case CONNECTION_STATES.DISCONNECTED:
        return "Disconnected from server";
      case CONNECTION_STATES.RECONNECTING:
        return "Reconnecting...";
      case CONNECTION_STATES.CONNECTED:
        return "Connected";
      default:
        return "";
    }
  };

  const getStatusClass = () => {
    switch (connectionState) {
      case CONNECTION_STATES.DISCONNECTED:
        return "bg-red-500";
      case CONNECTION_STATES.RECONNECTING:
        return "bg-yellow-500";
      case CONNECTION_STATES.CONNECTED:
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`${getStatusClass()} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2`}
      >
        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        <span>{getStatusMessage()}</span>
      </div>
    </div>
  );
};
