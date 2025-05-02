import { create } from "zustand";
import { WebSocketManager } from "@/core/websocket/WebSocketManager";
import { ENV } from "@/core/config/env";
import { CONNECTION_STATES } from "@/core/constants/websocket";

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  username: string | null;
  wsManager: WebSocketManager | null;
  connectionState: string;
  setToken: (token: string | null) => void;
  setUsername: (username: string) => void;
  clearToken: () => void;
  initializeWebSocket: () => void;
  cleanupWebSocket: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem("access_token"),
  isAuthenticated: !!localStorage.getItem("access_token"),
  wsManager: null,
  connectionState: CONNECTION_STATES.INITIAL,
  username: localStorage.getItem("username"),
  setUsername: (username: string) => {
    if (username) {
      localStorage.setItem("username", username);
    } else {
      localStorage.removeItem("username");
    }
    set({ username });
  },
  setToken: (token: string | null) => {
    if (token) {
      localStorage.setItem("access_token", token);
    } else {
      localStorage.removeItem("access_token");
    }

    set({ token, isAuthenticated: !!token });

    // Handle WebSocket lifecycle based on token changes
    const { wsManager, cleanupWebSocket, initializeWebSocket } = get();

    if (wsManager) {
      cleanupWebSocket();
    }

    if (token) {
      initializeWebSocket();
    }
  },

  clearToken: () => {
    localStorage.removeItem("access_token");
    set({ token: null, isAuthenticated: false });
    get().cleanupWebSocket();
  },

  initializeWebSocket: () => {
    const { token, wsManager } = get();

    if (!token) {
      console.log("WebSocket: Cannot initialize without token");
      return;
    }

    if (wsManager) {
      console.log("WebSocket: Already initialized");
      return;
    }

    console.log("WebSocket: Initializing with token");
    const newWsManager = WebSocketManager.getInstance({
      url: ENV.WS_URL,
      authToken: token,
      autoConnect: true,
      autoReconnect: true,
      debug: import.meta.env.DEV,
    });

    set({ wsManager: newWsManager });

    // Listen to connection state changes
    newWsManager.on("connecting", () => {
      console.log("WebSocket: Connecting");
      set({ connectionState: CONNECTION_STATES.CONNECTING });
    });

    newWsManager.on("connected", () => {
      console.log("WebSocket: Connected");
      set({ connectionState: CONNECTION_STATES.CONNECTED });
    });

    newWsManager.on("disconnected", () => {
      console.log("WebSocket: Disconnected");
      set({ connectionState: CONNECTION_STATES.DISCONNECTED });
    });
  },

  cleanupWebSocket: () => {
    const { wsManager } = get();

    if (wsManager) {
      console.log("WebSocket: Cleaning up");
      wsManager.destroy();
      set({ wsManager: null, connectionState: CONNECTION_STATES.INITIAL });
    }
  },
}));
