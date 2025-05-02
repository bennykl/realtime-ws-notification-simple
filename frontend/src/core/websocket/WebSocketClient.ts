import { ENV } from "../config/env";

type Timer = ReturnType<typeof setInterval>;

export interface WebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  autoReconnect?: boolean;
  debug?: boolean;
  heartbeatInterval?: number;
  authToken?: string;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private options: WebSocketOptions;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private heartbeatInterval: Timer | null = null;

  constructor(options: WebSocketOptions = {}) {
    this.options = {
      url: ENV.WS_URL,
      autoConnect: true,
      autoReconnect: true,
      debug: ENV.DEBUG,
      heartbeatInterval: 30000,
      ...options,
    };

    if (this.options.autoConnect) {
      this.connect();
    }
  }

  public connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const url = this.options.url;
      if (!url) {
        throw new Error("WebSocket URL is required");
      }

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.log("WebSocket connected");
        this.startHeartbeat();
        this.emit("connect");
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit("message", data);
          if (data.type) {
            this.emit(data.type, data);
          }
        } catch (error) {
          this.log("Error parsing message:", error);
        }
      };

      this.ws.onclose = () => {
        this.log("WebSocket disconnected");
        this.stopHeartbeat();
        this.emit("disconnect");
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        this.log("WebSocket error:", error);
        this.emit("error", error);
      };
    } catch (error) {
      this.log("Error connecting to WebSocket:", error);
      this.handleReconnect();
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopHeartbeat();
  }

  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
  }

  public off(event: string, callback: Function): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  public emit(event: string, data?: any): void {
    this.eventListeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        this.log(`Error in ${event} event handler:`, error);
      }
    });
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private handleReconnect(): void {
    if (
      !this.options.autoReconnect ||
      this.reconnectAttempts >= this.maxReconnectAttempts
    ) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    if (!this.options.heartbeatInterval) return;

    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.ws?.send(JSON.stringify({ type: "ping" }));
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private log(...args: any[]): void {
    if (this.options.debug) {
      console.log("[WebSocket]", ...args);
    }
  }
}
