import { useEffect, useRef, useCallback } from "react";
import WebSocketManager, {
  WebSocketOptions,
} from "@/features/notifications/core/WebSocketManager";

type EventCallback = (...args: any[]) => void;

export function useWebSocket(options: WebSocketOptions) {
  const wsManager = useRef<WebSocketManager | null>(null);
  const callbacks = useRef<Map<string, Set<EventCallback>>>(new Map());

  useEffect(() => {
    wsManager.current = WebSocketManager.getInstance(options);

    return () => {
      if (wsManager.current) {
        wsManager.current.destroy();
        wsManager.current = null;
      }
    };
  }, [options.url, options.protocols]);

  const on = useCallback((event: string, callback: EventCallback) => {
    if (!wsManager.current) return;

    if (!callbacks.current.has(event)) {
      callbacks.current.set(event, new Set());
    }
    callbacks.current.get(event)!.add(callback);

    wsManager.current.on(event, callback);
  }, []);

  const off = useCallback((event: string, callback: EventCallback) => {
    if (!wsManager.current) return;

    if (callbacks.current.has(event)) {
      callbacks.current.get(event)!.delete(callback);
    }

    wsManager.current.off(event, callback);
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

  const getClientId = useCallback(() => {
    if (!wsManager.current) return null;
    return wsManager.current.getClientId();
  }, []);

  const disconnect = useCallback((code?: number, reason?: string) => {
    if (!wsManager.current) return;
    wsManager.current.disconnect(code, reason);
  }, []);

  useEffect(() => {
    return () => {
      if (wsManager.current) {
        callbacks.current.forEach((callbacks, event) => {
          callbacks.forEach((callback) => {
            wsManager.current!.off(event, callback);
          });
        });
        callbacks.current.clear();
      }
    };
  }, []);

  return {
    on,
    off,
    send,
    isConnected,
    getState,
    getClientId,
    disconnect,
  };
}
