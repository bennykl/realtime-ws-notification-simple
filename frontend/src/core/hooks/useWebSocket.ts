import { useEffect, useRef, useCallback } from "react";
import { WebSocketManager } from "@/core/websocket/WebSocketManager";
import { WebSocketOptions } from "../websocket/WebSocketClient";
import { ENV } from "../config/env";

type EventCallback = (data?: any) => void;

interface ManagerWebSocketOptions extends WebSocketOptions {
  url: string;
  authToken: string;
}

export function useWebSocket(options: Partial<WebSocketOptions> = {}) {
  const defaultOptions: ManagerWebSocketOptions = {
    url: ENV.WS_URL,
    autoConnect: true,
    autoReconnect: true,
    debug: ENV.DEBUG,
    heartbeatInterval: 30000,
    authToken: localStorage.getItem("access_token") || "",
  };

  const finalOptions: ManagerWebSocketOptions = {
    ...defaultOptions,
    ...options,
  };

  console.log("useWebSocket: Hook initialization", {
    hasToken: !!finalOptions.authToken,
    autoConnect: finalOptions.autoConnect,
    autoReconnect: finalOptions.autoReconnect,
  });

  const wsManager = useRef<WebSocketManager | null>(null);
  const callbacks = useRef<Map<string, Set<EventCallback>>>(new Map());

  // Effect to handle WebSocketManager creation and cleanup
  useEffect(() => {
    console.log("useWebSocket: Creating WebSocketManager instance", {
      hasToken: !!finalOptions.authToken,
      url: finalOptions.url,
      autoConnect: finalOptions.autoConnect,
      autoReconnect: finalOptions.autoReconnect,
      currentState: wsManager.current?.getState(),
      isConnected: wsManager.current?.isConnected(),
    });

    // Cleanup existing WebSocketManager if it exists
    if (wsManager.current) {
      console.log("useWebSocket: Cleaning up existing WebSocketManager");
      wsManager.current.destroy();
      wsManager.current = null;
    }

    // Create new WebSocketManager if we have a token or autoConnect is false
    if (finalOptions.authToken || !finalOptions.autoConnect) {
      wsManager.current = WebSocketManager.getInstance(finalOptions);
    }

    return () => {
      console.log("useWebSocket: Starting cleanup phase", {
        hasManager: !!wsManager.current,
        currentState: wsManager.current?.getState(),
        isConnected: wsManager.current?.isConnected(),
        hasToken: !!finalOptions.authToken,
        socketState: wsManager.current?.getSocketState(),
      });

      if (wsManager.current) {
        wsManager.current.destroy();
        wsManager.current = null;
      }
    };
  }, [finalOptions.url, finalOptions.authToken, finalOptions.autoConnect]);

  // Effect to handle event handlers
  useEffect(() => {
    if (!wsManager.current) return;

    // Register all stored callbacks
    callbacks.current.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        wsManager.current!.on(event, callback);
      });
    });

    return () => {
      if (wsManager.current) {
        callbacks.current.forEach((callbacks, event) => {
          callbacks.forEach((callback) => {
            wsManager.current!.off(event, callback);
          });
        });
      }
    };
  }, [wsManager.current]);

  const on = useCallback((event: string, callback: EventCallback) => {
    if (!callbacks.current.has(event)) {
      callbacks.current.set(event, new Set());
    }
    callbacks.current.get(event)!.add(callback);

    if (wsManager.current) {
      wsManager.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event: string, callback: EventCallback) => {
    if (callbacks.current.has(event)) {
      callbacks.current.get(event)!.delete(callback);
    }

    if (wsManager.current) {
      wsManager.current.off(event, callback);
    }
  }, []);

  const send = useCallback((message: { type: string; payload: any }) => {
    if (!wsManager.current) return false;
    return wsManager.current.send(message);
  }, []);

  const isConnected = useCallback(() => {
    if (!wsManager.current) return false;
    return wsManager.current.isConnected();
  }, []);

  const getState = useCallback(() => {
    if (!wsManager.current) return null;
    return wsManager.current.getState();
  }, []);

  const disconnect = useCallback((code?: number, reason?: string) => {
    if (!wsManager.current) return;
    wsManager.current.disconnect(code, reason);
  }, []);

  return {
    on,
    off,
    send,
    isConnected,
    getState,
    disconnect,
  };
}
