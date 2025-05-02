import "./App.css";
import { NotificationProvider } from "@/core/contexts/NotificationContext";
import { Toaster } from "sonner";
import { AppRoutes } from "@/routes";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { ConnectionStatus } from "./components/connection-status/ConnectionStatus";

export default function App() {
  const { token, initializeWebSocket } = useAuthStore();

  useEffect(() => {
    console.log("App: Mounted", {
      hasToken: !!token,
    });

    // Initialize WebSocket if we have a token
    if (token) {
      initializeWebSocket();
    }
  }, [token, initializeWebSocket]);

  return (
    <NotificationProvider>
      <AppRoutes />
      <Toaster position="bottom-right" richColors />
      <ConnectionStatus />
    </NotificationProvider>
  );
}
