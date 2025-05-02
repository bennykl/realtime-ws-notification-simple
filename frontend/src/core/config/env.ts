export const ENV = {
  WS_URL: import.meta.env.VITE_WS_URL,
  API_URL: import.meta.env.VITE_API_URL,
  DEBUG: import.meta.env.VITE_DEBUG === "true",
} as const;
