import {
  WS_EVENTS,
  CONNECTION_STATES,
  DEFAULT_RECONNECT_OPTIONS,
  MessageType,
  ConnectionState,
} from "./constants";
import { calculateBackoff } from "./utils/reconnectionStrategy";
import {
  serializeMessage,
  deserializeMessage,
} from "./utils/messageSerializer";
import { generateClientId } from "./utils/idGenerator";
import logger from "@/shared/utils/logger";

export type WebSocketOptions = {
  url: string;
  protocols?: string | string[];
  autoConnect?: boolean;
  autoReconnect?: boolean;
  reconnectOptions?: {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    factor: number;
  };
  authToken?: string;
  heartbeatInterval?: number;
  debug?: boolean;
  clientId?: string;
};

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
          logger.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  public removeAllListeners(): void {
    this.listeners.clear();
  }
}

/**
 * WebSocketManager - A singleton class that manages WebSocket connections with automatic reconnection,
 * heartbeat, and message queuing capabilities.
 *
 * Features:
 * - Singleton pattern to ensure single WebSocket instance
 * - Automatic reconnection with configurable backoff strategy
 * - Message queuing when disconnected
 * - Heartbeat mechanism to keep connection alive
 * - Graceful shutdown handling
 * - State tracking for connection lifecycle
 * - Event-based communication
 *
 * Connection States:
 * - INITIAL: Initial state before connection
 * - CONNECTING: Attempting to establish connection
 * - CONNECTED: Successfully connected and authenticated
 * - DISCONNECTING: In the process of closing connection
 * - DISCONNECTED: Connection is closed
 * - FAILED: Maximum reconnection attempts reached
 */
export class WebSocketManager extends EventEmitter {
  private static instance: WebSocketManager | null = null;
  private socket: WebSocket | null = null;
  private options: WebSocketOptions;
  private connectionState: ConnectionState;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private messageQueue: Array<{ type: string; payload: any }> = [];
  private clientId: string;
  private lastMessageId: string | null = null;
  /**
   * Flag to indicate if the disconnection is expected (e.g., page refresh, tab close)
   * Used to prevent unnecessary error logging and reconnection attempts
   */
  private isGracefulShutdown: boolean = false;
  /**
   * Flag to track if a connection attempt is in progress
   * Used to handle edge cases during connection establishment
   */
  private isConnecting: boolean = false;

  /**
   * Private constructor to enforce singleton pattern
   * @param options - Configuration options for WebSocket connection
   */
  private constructor(options: WebSocketOptions) {
    super();
    this.options = {
      ...options,
      autoConnect: options.autoConnect ?? true,
      autoReconnect: options.autoReconnect ?? true,
      reconnectOptions: {
        ...DEFAULT_RECONNECT_OPTIONS,
        ...(options.reconnectOptions || DEFAULT_RECONNECT_OPTIONS),
      },
      debug: options.debug ?? import.meta.env.DEV,
    };
    this.connectionState = CONNECTION_STATES.INITIAL;
    this.clientId = options.clientId || generateClientId();

    if (this.options.autoConnect) {
      this.connect();
    }
  }

  /**
   * Get the singleton instance of WebSocketManager
   * @param options - Configuration options for initial instantiation
   * @returns WebSocketManager instance
   */
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

  /**
   * Update WebSocket options
   * @param options - Partial options to update
   */
  private updateOptions(options: Partial<WebSocketOptions>): void {
    this.options = {
      ...this.options,
      ...options,
      reconnectOptions: {
        ...this.options.reconnectOptions,
        ...(options.reconnectOptions || DEFAULT_RECONNECT_OPTIONS),
      },
    };

    if (options.authToken && this.isConnected()) {
      this.sendAuthMessage();
    }
  }

  /**
   * Establish WebSocket connection
   * Handles connection setup, URL parameterization, and event handler attachment
   */
  public connect(): void {
    if (this.socket && this.isConnected()) {
      logger.warn("WebSocketManager: Already connected");
      return;
    }

    try {
      const urlWithParams = new URL(this.options.url);
      urlWithParams.searchParams.append("clientId", this.clientId);
      if (this.options.authToken) {
        urlWithParams.searchParams.append("token", this.options.authToken);
      }

      this.connectionState = CONNECTION_STATES.CONNECTING;
      this.isConnecting = true;
      this.socket = new WebSocket(
        urlWithParams.toString(),
        this.options.protocols
      );

      this.attachEventHandlers();
      this.emit(WS_EVENTS.CONNECTING);

      logger.info("WebSocketManager: Connecting to", urlWithParams.toString());
    } catch (error) {
      this.isConnecting = false;
      logger.error("WebSocketManager: Connection error", error);
      this.handleError(error as Error);
    }
  }

  /**
   * Attach event handlers to WebSocket instance
   * Handles open, close, error, and message events
   */
  private attachEventHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = this.handleOpen.bind(this);
    this.socket.onclose = this.handleClose.bind(this);
    this.socket.onerror = (event) => {
      // Skip error logging if we're in the process of connecting and it's a graceful shutdown
      if (this.isConnecting && this.isGracefulShutdown) {
        return;
      }
      logger.error("WebSocketManager: WebSocket error", event);
      this.handleError(new Error("WebSocket error"));
    };
    this.socket.onmessage = this.handleMessage.bind(this);
  }

  /**
   * Handle WebSocket open event
   * Sets up connection state, sends auth message if needed, and starts heartbeat
   */
  private handleOpen(): void {
    this.connectionState = CONNECTION_STATES.CONNECTED;
    this.isConnecting = false;
    this.reconnectAttempts = 0;

    logger.info("WebSocketManager: Connection established");
    this.emit(WS_EVENTS.CONNECTED);

    if (this.options.authToken) {
      logger.debug("WebSocketManager: Sending auth message");
      this.sendAuthMessage();
    }

    this.flushMessageQueue();
    this.setupHeartbeat();
  }

  /**
   * Handle WebSocket close event
   * Manages connection state and cleanup
   * @param event - CloseEvent from WebSocket
   */
  private handleClose(event: CloseEvent): void {
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.isConnecting = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Only log if it's not a normal closure (1000) or going away (1001) and not during graceful shutdown
    if (
      event.code !== 1000 &&
      event.code !== 1001 &&
      !this.isGracefulShutdown
    ) {
      logger.info(
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

  /**
   * Handle WebSocket errors
   * Manages error logging and event emission
   * @param error - Error object
   */
  private handleError(error: Error): void {
    // Skip error logging if we're in the process of connecting and it's a graceful shutdown
    if (this.isConnecting && this.isGracefulShutdown) {
      return;
    }

    // Only log error if we're not in a disconnecting state or during graceful shutdown
    if (
      this.connectionState !== CONNECTION_STATES.DISCONNECTING &&
      !this.isGracefulShutdown
    ) {
      logger.error("WebSocketManager: Error", error);
    }
    this.emit(WS_EVENTS.ERROR, error);
  }

  /**
   * Handle incoming WebSocket messages
   * Processes different message types and emits appropriate events
   * @param event - MessageEvent from WebSocket
   */
  private handleMessage(event: MessageEvent): void {
    try {
      logger.debug("WebSocketManager: Raw message received", event.data);
      const message = deserializeMessage(event.data);
      logger.debug("WebSocketManager: Parsed message", message);

      if (message.id) {
        this.lastMessageId = message.id;
      }

      switch (message.type) {
        case MessageType.NOTIFICATION:
          logger.debug("WebSocketManager: Processing notification", message);
          if (message.payload) {
            this.emit(WS_EVENTS.NOTIFICATION, message.payload);
          } else {
            logger.error(
              "WebSocketManager: Notification missing payload",
              message
            );
          }
          break;
        case MessageType.HEARTBEAT:
          this.send({
            type: MessageType.HEARTBEAT_ACK,
            payload: { timestamp: Date.now() },
          });
          break;
        case MessageType.AUTH_SUCCESS:
          logger.info("WebSocketManager: Authentication successful");
          this.emit(WS_EVENTS.AUTH_SUCCESS, message.payload);
          break;
        case MessageType.AUTH_ERROR:
          logger.error(
            "WebSocketManager: Authentication failed",
            message.payload
          );
          this.emit(WS_EVENTS.AUTH_ERROR, message.payload);
          break;
        case MessageType.ERROR:
          logger.error("WebSocketManager: Server error", message.payload);
          this.emit(WS_EVENTS.SERVER_ERROR, message.payload);
          break;
        default:
          logger.debug(
            "WebSocketManager: Unhandled message type",
            message.type
          );
          this.emit(WS_EVENTS.MESSAGE, message);
          break;
      }
    } catch (error) {
      logger.error("WebSocketManager: Error processing message", error);
    }
  }

  /**
   * Send authentication message to server
   * Includes token, clientId, and lastMessageId for message continuity
   */
  private sendAuthMessage(): void {
    this.send({
      type: MessageType.AUTH,
      payload: {
        token: this.options.authToken,
        clientId: this.clientId,
        lastMessageId: this.lastMessageId,
      },
    });
  }

  /**
   * Set up heartbeat mechanism to keep connection alive
   * Sends periodic heartbeat messages if configured
   */
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

  /**
   * Schedule reconnection attempt with exponential backoff
   * Manages maximum attempts and delay calculation
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;

    if (
      this.options.reconnectOptions &&
      this.reconnectAttempts > this.options.reconnectOptions.maxAttempts
    ) {
      logger.warn(
        `WebSocketManager: Reached maximum reconnect attempts (${this.options.reconnectOptions.maxAttempts})`
      );
      this.connectionState = CONNECTION_STATES.FAILED;
      this.emit(WS_EVENTS.RECONNECT_FAILED);
      return;
    }

    const delay = calculateBackoff(
      this.reconnectAttempts,
      this.options.reconnectOptions || DEFAULT_RECONNECT_OPTIONS
    );

    logger.info(
      `WebSocketManager: Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`
    );
    this.emit(WS_EVENTS.RECONNECTING, {
      attempt: this.reconnectAttempts,
      delay,
    });

    this.reconnectTimeout = setTimeout(() => {
      if (this.connectionState !== CONNECTION_STATES.CONNECTING) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Send message through WebSocket connection
   * Queues message if not connected
   * @param message - Message to send
   * @returns boolean indicating if message was sent successfully
   */
  public send(message: { type: string; payload: any }): boolean {
    if (!this.isConnected()) {
      this.messageQueue.push(message);
      logger.info(
        "WebSocketManager: Message queued (not connected)",
        message.type
      );
      return false;
    }

    try {
      const serialized = serializeMessage(message);
      this.socket!.send(serialized);

      if (this.options.debug) {
        logger.debug("WebSocketManager: Message sent", message);
      }

      return true;
    } catch (error) {
      logger.error("WebSocketManager: Error sending message", error);
      return false;
    }
  }

  /**
   * Flush queued messages when connection is established
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    logger.info(
      `WebSocketManager: Flushing ${this.messageQueue.length} queued messages`
    );

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach((message) => {
      this.send(message);
    });
  }

  /**
   * Check if WebSocket is currently connected
   * @returns boolean indicating connection status
   */
  public isConnected(): boolean {
    return (
      this.socket !== null &&
      this.socket.readyState === WebSocket.OPEN &&
      this.connectionState === CONNECTION_STATES.CONNECTED
    );
  }

  /**
   * Get current connection state
   * @returns ConnectionState enum value
   */
  public getState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get client ID
   * @returns string client ID
   */
  public getClientId(): string {
    return this.clientId;
  }

  /**
   * Disconnect WebSocket connection
   * Handles cleanup and state management
   * @param code - WebSocket close code
   * @param reason - Close reason
   */
  public disconnect(
    code: number = 1000,
    reason: string = "Client disconnect"
  ): void {
    this.isGracefulShutdown = true;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // If we're still connecting, just close the socket without logging
    if (this.isConnecting && this.socket) {
      this.socket.close(code, reason);
      this.socket = null;
      this.connectionState = CONNECTION_STATES.DISCONNECTED;
      return;
    }

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      this.connectionState = CONNECTION_STATES.DISCONNECTING;
      this.socket.close(code, reason);
    }

    this.socket = null;
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
  }

  /**
   * Destroy WebSocketManager instance
   * Cleans up resources and resets singleton instance
   */
  public destroy(): void {
    this.isGracefulShutdown = true;
    this.disconnect();
    this.removeAllListeners();
    WebSocketManager.instance = null;
  }
}

export default WebSocketManager;
