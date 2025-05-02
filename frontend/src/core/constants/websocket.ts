export const WS_EVENTS = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  ERROR: "error",
  MESSAGE: "message",
  NOTIFICATION: "notification",
  SERVER_ERROR: "server_error",
  RECONNECTING: "reconnecting",
  RECONNECT_FAILED: "reconnect_failed",
  AUTH_SUCCESS: "auth_success",
  AUTH_ERROR: "auth_error",
} as const;

export const CONNECTION_STATES = {
  INITIAL: "initial",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTING: "disconnecting",
  DISCONNECTED: "disconnected",
  FAILED: "failed",
  RECONNECTING: "reconnecting",
} as const;

export const DEFAULT_RECONNECT_OPTIONS = {
  maxAttempts: 5,
  initialDelay: 1000,
  maxDelay: 30000,
  factor: 2,
} as const;

export const MessageType = {
  AUTH: "auth",
  AUTH_SUCCESS: "auth_success",
  AUTH_ERROR: "auth_error",
  NOTIFICATION: "notification",
  HEARTBEAT: "heartbeat",
  HEARTBEAT_ACK: "heartbeat_ack",
  ERROR: "error",
} as const;

export type ConnectionState =
  (typeof CONNECTION_STATES)[keyof typeof CONNECTION_STATES];
