import {
  WS_EVENTS,
  CONNECTION_STATES,
  DEFAULT_RECONNECT_OPTIONS,
  MessageType,
  ConnectionState,
} from "@/core/constants/websocket";
import {
  calculateBackoff,
  shouldReconnect,
  formatReconnectMessage,
} from "@/core/utils/reconnectionStrategy";

type EventCallback = (...args: any[]) => void;

class EventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  public on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: EventCallback): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  public emit(event: string, ...args: any[]): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  public removeAllListeners(): void {
    this.listeners.clear();
  }
}

interface WebSocketOptions {
  url: string;
  authToken?: string;
  autoConnect?: boolean;
  autoReconnect?: boolean;
  protocols?: string | string[];
  reconnectOptions?: {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    factor: number;
    jitter?: boolean;
  };
  heartbeatInterval?: number;
  debug?: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  priority?: "low" | "medium" | "high";
  topic?: string;
}

export class WebSocketManager extends EventEmitter {
  private static instance: WebSocketManager | null = null;
  private socket: WebSocket | null = null;
  private options: Required<WebSocketOptions>;
  private connectionState: ConnectionState;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private messageQueue: Array<{ type: string; payload: any }> = [];
  private isGracefulShutdown: boolean = false;
  private isConnecting: boolean = false;
  private eventHandlers: Map<string, (event: any) => void> = new Map();
  private networkStateHandlers: Map<string, () => void> = new Map();

  private constructor(options: WebSocketOptions) {
    super();
    this.options = {
      autoConnect: true,
      autoReconnect: true,
      protocols: [],
      authToken: "",
      reconnectOptions: {
        ...DEFAULT_RECONNECT_OPTIONS,
        ...(options.reconnectOptions || {}),
      },
      heartbeatInterval: 30000,
      debug: import.meta.env.DEV,
      ...options,
    };
    this.connectionState = CONNECTION_STATES.INITIAL;

    // Initialize network state detection
    this.initializeNetworkStateDetection();

    // Validate URL on initialization
    this.validateAndNormalizeUrl();

    // Only auto-connect if we have a token
    if (this.options.autoConnect && this.options.authToken) {
      this.connect();
    } else if (this.options.autoConnect) {
      console.warn(
        "WebSocketManager: Auto-connect disabled due to missing auth token"
      );
    }
  }

  private initializeNetworkStateDetection(): void {
    // Handle online event
    const handleOnline = () => {
      console.log("WebSocketManager: Network is back online");
      if (this.connectionState === CONNECTION_STATES.DISCONNECTED) {
        this.connect();
      }
    };

    // Handle offline event
    const handleOffline = () => {
      console.log("WebSocketManager: Network is offline");
      if (this.socket) {
        this.setConnectionState(CONNECTION_STATES.DISCONNECTED);
        this.disconnect(1000, "Network offline");
      }
    };

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    if (!navigator.onLine) {
      handleOffline();
    }

    // Store handlers for cleanup
    this.networkStateHandlers.set("online", handleOnline);
    this.networkStateHandlers.set("offline", handleOffline);
  }

  private cleanupNetworkStateDetection(): void {
    // Remove all network state event listeners
    this.networkStateHandlers.forEach((handler, event) => {
      window.removeEventListener(event, handler);
    });
    this.networkStateHandlers.clear();
  }

  private validateAndNormalizeUrl(): void {
    try {
      console.log("this.options.url", this.options.url);
      const url = new URL(this.options.url);
      console.log("url", url);
      // Ensure WebSocket protocol
      if (!url.protocol.startsWith("ws")) {
        throw new Error(`Invalid WebSocket protocol: ${url.protocol}`);
      }

      // Ensure path exists
      if (!url.pathname || url.pathname === "/") {
        throw new Error("WebSocket URL must include a path");
      }

      // Normalize URL
      this.options.url = url.toString();

      if (this.options.debug) {
        console.log("WebSocketManager: URL validated and normalized", {
          original: this.options.url,
          normalized: url.toString(),
        });
      }
    } catch (error) {
      console.error("WebSocketManager: URL validation failed", error);
      throw error;
    }
  }

  public static getInstance(options?: WebSocketOptions): WebSocketManager {
    if (!WebSocketManager.instance) {
      if (!options) {
        throw new Error(
          "WebSocketManager: options must be provided for initial instantiation"
        );
      }
      WebSocketManager.instance = new WebSocketManager(options);
    } else if (options) {
      WebSocketManager.instance.updateOptions(options);
    }
    return WebSocketManager.instance;
  }

  private updateOptions(options: Partial<WebSocketOptions>): void {
    console.log("WebSocketManager: Updating options", {
      hasNewToken: !!options.authToken,
      currentState: this.connectionState,
      isConnected: this.isConnected(),
    });

    this.options = {
      ...this.options,
      ...options,
      reconnectOptions: {
        ...this.options.reconnectOptions,
        ...(options.reconnectOptions || {}),
      },
    };

    if (options.authToken && this.isConnected()) {
      console.log("WebSocketManager: Sending auth message with new token");
      this.sendAuthMessage();
    } else if (options.authToken && !this.isConnected()) {
      console.log("WebSocketManager: Connecting with new token");
      this.connect();
    }
  }

  public connect(): void {
    console.log("WebSocketManager: Attempting to connect", {
      hasToken: !!this.options.authToken,
      currentState: this.connectionState,
      isConnecting: this.isConnecting,
    });

    if (!this.options.authToken) {
      console.warn("WebSocketManager: Cannot connect without auth token");
      this.handleError(new Error("No auth token provided"));
      return;
    }

    if (this.socket && this.isConnected()) {
      console.warn("WebSocketManager: Already connected");
      return;
    }

    try {
      const urlWithParams = new URL(this.options.url);

      if (this.options.authToken) {
        console.log(
          "WebSocketManager: Adding token to URL",
          this.options.authToken
        );
        urlWithParams.searchParams.set("token", this.options.authToken);
      } else {
        console.warn("WebSocketManager: No auth token provided");
      }

      this.connectionState = CONNECTION_STATES.CONNECTING;
      this.isConnecting = true;
      const finalUrl = urlWithParams.toString();

      if (this.options.debug) {
        console.log("WebSocketManager: Connection attempt", {
          url: finalUrl,
          hasToken: !!this.options.authToken,
          protocols: this.options.protocols,
        });
      }

      this.socket = new WebSocket(finalUrl, this.options.protocols);
      this.attachEventHandlers();
      this.emit(WS_EVENTS.CONNECTING);
    } catch (error) {
      this.isConnecting = false;
      console.error("WebSocketManager: Connection error", error);
      this.handleError(error as Error);
    }
  }

  private attachEventHandlers(): void {
    if (!this.socket) return;

    // Remove existing handlers first to prevent duplicates
    this.removeEventHandlers();

    const onOpen = () => {
      console.log("WebSocketManager: Connection established", {
        url: this.socket?.url,
        readyState: this.socket?.readyState,
      });
      this.handleOpen();
    };

    const onClose = (event: CloseEvent) => {
      console.log("WebSocketManager: Connection closed", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        currentState: this.connectionState,
        reconnectAttempts: this.reconnectAttempts,
        socketState: this.socket?.readyState,
      });
      this.handleClose(event);
    };

    const onError = (event: Event) => {
      console.error("WebSocketManager: Connection error", {
        event,
        currentState: this.connectionState,
      });
      this.handleError(new Error("WebSocket error"));
    };

    const onMessage = (event: MessageEvent) => {
      console.log("WebSocketManager: Message received", {
        data: event.data,
        timestamp: new Date().toISOString(),
      });
      this.handleMessage(event);
    };

    // Store handlers for later removal
    this.eventHandlers.set("open", onOpen);
    this.eventHandlers.set("close", onClose);
    this.eventHandlers.set("error", onError);
    this.eventHandlers.set("message", onMessage);

    // Attach handlers
    this.socket.addEventListener("open", onOpen);
    this.socket.addEventListener("close", onClose);
    this.socket.addEventListener("error", onError);
    this.socket.addEventListener("message", onMessage);
  }

  private removeEventHandlers(): void {
    if (!this.socket) return;

    // Remove all stored handlers
    this.eventHandlers.forEach((handler, event) => {
      this.socket?.removeEventListener(event, handler);
    });

    // Clear the handlers map
    this.eventHandlers.clear();
  }

  private setConnectionState(newState: ConnectionState): void {
    console.log("WebSocketManager: State transition", {
      from: this.connectionState,
      to: newState,
      hasToken: !!this.options.authToken,
      isConnecting: this.isConnecting,
      socketState: this.socket?.readyState,
    });
    this.connectionState = newState;
  }

  private handleOpen(): void {
    console.log("WebSocketManager: Connection opened", {
      state: this.connectionState,
      hasToken: !!this.options.authToken,
      socketState: this.socket?.readyState,
    });
    this.setConnectionState(CONNECTION_STATES.CONNECTED);
    this.isConnecting = false;
    this.reconnectAttempts = 0;

    if (this.options.debug) {
      console.log("WebSocketManager: Connection established");
    }
    this.emit(WS_EVENTS.CONNECTED);

    if (this.options.authToken) {
      this.sendAuthMessage();
    }

    this.flushMessageQueue();
    this.setupHeartbeat();
  }

  private handleClose(event: CloseEvent): void {
    console.log("WebSocketManager: Connection closed", {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      currentState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      socketState: this.socket?.readyState,
    });

    // Set state to disconnected before cleanup
    this.setConnectionState(CONNECTION_STATES.DISCONNECTED);
    this.isConnecting = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (
      event.code !== 1000 &&
      event.code !== 1001 &&
      !this.isGracefulShutdown
    ) {
      console.log(
        `WebSocketManager: Connection closed (${event.code}: ${event.reason})`
      );
    }

    this.emit(WS_EVENTS.DISCONNECTED, event);

    if (
      this.options.autoReconnect &&
      event.code !== 1000 &&
      !this.isGracefulShutdown
    ) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Error): void {
    console.log("WebSocketManager: Error occurred", {
      error: error.message,
      currentState: this.connectionState,
      hasToken: !!this.options.authToken,
      isConnecting: this.isConnecting,
    });
    if (this.isConnecting && this.isGracefulShutdown) {
      return;
    }

    if (
      this.connectionState !== CONNECTION_STATES.DISCONNECTING &&
      !this.isGracefulShutdown
    ) {
      console.error("WebSocketManager: Error", error);
    }
    this.emit(WS_EVENTS.ERROR, error);
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      console.log("WebSocketManager: Processing message", {
        type: message.type,
        hasPayload: !!message.payload,
        currentState: this.connectionState,
      });

      switch (message.type) {
        case MessageType.NOTIFICATION:
          if (message.payload) {
            this.emit(WS_EVENTS.NOTIFICATION, message.payload);
          }
          break;
        case MessageType.HEARTBEAT:
          this.send({
            type: MessageType.HEARTBEAT_ACK,
            payload: { timestamp: Date.now() },
          });
          break;
        case MessageType.AUTH_SUCCESS:
          this.emit(WS_EVENTS.AUTH_SUCCESS, message.payload);
          break;
        case MessageType.AUTH_ERROR:
          this.emit(WS_EVENTS.AUTH_ERROR, message.payload);
          break;
        case MessageType.ERROR:
          this.emit(WS_EVENTS.SERVER_ERROR, message.payload);
          break;
        default:
          this.emit(WS_EVENTS.MESSAGE, message);
          break;
      }
    } catch (error) {
      console.error("WebSocketManager: Error processing message", error);
    }
  }

  private sendAuthMessage(): void {
    this.send({
      type: MessageType.AUTH,
      payload: {
        token: this.options.authToken,
      },
    });
  }

  private setupHeartbeat(): void {
    if (this.options.heartbeatInterval && this.options.heartbeatInterval > 0) {
      this.heartbeatInterval = setInterval(() => {
        if (this.isConnected()) {
          this.send({
            type: MessageType.HEARTBEAT,
            payload: { timestamp: Date.now() },
          });
        }
      }, this.options.heartbeatInterval);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;

    if (
      !shouldReconnect(this.reconnectAttempts, this.options.reconnectOptions)
    ) {
      console.warn(
        `WebSocketManager: Reached maximum reconnect attempts (${this.options.reconnectOptions.maxAttempts})`
      );
      this.connectionState = CONNECTION_STATES.FAILED;
      this.emit(WS_EVENTS.RECONNECT_FAILED);
      return;
    }

    const delay = calculateBackoff(
      this.reconnectAttempts,
      this.options.reconnectOptions
    );

    if (this.options.debug) {
      console.log(formatReconnectMessage(this.reconnectAttempts, delay));
    }

    this.emit(WS_EVENTS.RECONNECTING, {
      attempt: this.reconnectAttempts,
      delay,
      maxAttempts: this.options.reconnectOptions.maxAttempts,
    });

    this.reconnectTimeout = setTimeout(() => {
      if (this.connectionState !== CONNECTION_STATES.CONNECTING) {
        this.connect();
      }
    }, delay);
  }

  public send(message: { type: string; payload: any }): boolean {
    console.log("WebSocketManager: Attempting to send message", {
      messageType: message.type,
      isConnected: this.isConnected(),
      hasToken: !!this.options.authToken,
    });
    if (!this.isConnected()) {
      this.messageQueue.push(message);
      if (this.options.debug) {
        console.log(
          "WebSocketManager: Message queued (not connected)",
          message.type
        );
      }
      return false;
    }

    try {
      this.socket!.send(JSON.stringify(message));
      if (this.options.debug) {
        console.log("WebSocketManager: Message sent", message);
      }
      return true;
    } catch (error) {
      console.error("WebSocketManager: Error sending message", error);
      return false;
    }
  }

  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log("WebSocketManager: Flushing message queue", {
      queueLength: this.messageQueue.length,
      currentState: this.connectionState,
    });

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach((message) => {
      this.send(message);
    });
  }

  public isConnected(): boolean {
    return (
      this.socket !== null &&
      this.socket.readyState === WebSocket.OPEN &&
      this.connectionState === CONNECTION_STATES.CONNECTED
    );
  }

  public isConnectingState(): boolean {
    return this.connectionState === CONNECTION_STATES.CONNECTING;
  }

  public getState(): ConnectionState {
    return this.connectionState;
  }

  public getSocketState(): number | null {
    return this.socket?.readyState ?? null;
  }

  public disconnect(
    code: number = 1000,
    reason: string = "Client disconnect"
  ): void {
    console.log("WebSocketManager: Disconnecting", {
      code,
      reason,
      currentState: this.connectionState,
      hasToken: !!this.options.authToken,
    });

    this.isGracefulShutdown = true;
    this.removeEventHandlers();

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.connectionState = CONNECTION_STATES.DISCONNECTING;
      this.socket.close(code, reason);
      this.socket = null;
    }

    this.connectionState = CONNECTION_STATES.DISCONNECTED;
  }

  public destroy(): void {
    console.log("WebSocketManager: Destroying instance", {
      currentState: this.connectionState,
      hasToken: !!this.options.authToken,
      messageQueueLength: this.messageQueue.length,
    });

    // Cleanup network state detection
    this.cleanupNetworkStateDetection();

    // Clear all event handlers first
    this.removeEventHandlers();
    this.removeAllListeners();

    // Clear all timeouts and intervals
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Disconnect if connected
    if (this.socket) {
      this.disconnect(1000, "Client disconnect");
    }

    // Clear message queue
    this.messageQueue = [];

    // Reset state
    this.connectionState = CONNECTION_STATES.INITIAL;
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    this.isGracefulShutdown = false;
  }

  public sendNotification(notification: Notification): void {
    console.log("WebSocketManager: Sending notification", {
      notificationId: notification.id,
      title: notification.title,
      socketState: this.socket?.readyState,
      isConnected: this.isConnected(),
      hasToken: !!this.options.authToken,
    });

    if (!this.isConnected()) {
      console.warn(
        "WebSocketManager: Cannot send notification - not connected"
      );
      this.handleError(new Error("Not connected to WebSocket"));
      return;
    }

    if (!this.options.authToken) {
      console.warn(
        "WebSocketManager: Cannot send notification - no auth token"
      );
      this.handleError(new Error("No auth token provided"));
      return;
    }

    try {
      this.socket?.send(JSON.stringify(notification));
      console.log("WebSocketManager: Notification sent successfully", {
        notificationId: notification.id,
        title: notification.title,
      });
    } catch (error) {
      console.error("WebSocketManager: Failed to send notification", {
        notificationId: notification.id,
        title: notification.title,
        error,
      });
      this.handleError(error as Error);
    }
  }
}
