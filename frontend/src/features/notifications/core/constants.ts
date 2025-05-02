export enum MessageType {
  AUTH = "auth",
  AUTH_SUCCESS = "auth_success",
  AUTH_ERROR = "auth_error",
  NOTIFICATION = "notification",
  HEARTBEAT = "heartbeat",
  HEARTBEAT_ACK = "heartbeat_ack",
  ERROR = "error",
}

export enum WS_EVENTS {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error",
  MESSAGE = "message",
  NOTIFICATION = "notification",
  AUTH_SUCCESS = "auth_success",
  AUTH_ERROR = "auth_error",
  SERVER_ERROR = "server_error",
  RECONNECTING = "reconnecting",
  RECONNECT_FAILED = "reconnect_failed",
}

export const CONNECTION_STATES = {
  INITIAL: "initial",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTING: "disconnecting",
  DISCONNECTED: "disconnected",
  FAILED: "failed",
} as const;

export type ConnectionState = typeof CONNECTION_STATES[keyof typeof CONNECTION_STATES];

export const DEFAULT_RECONNECT_OPTIONS = {
  maxAttempts: 5,
  initialDelay: 1000,
  maxDelay: 30000,
  factor: 2,
};
