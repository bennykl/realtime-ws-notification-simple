import { apiClient } from "./axios";

export const API_ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
  },
  notifications: {
    send: "/api/notifications/send",
  },
} as const;

export const authApi = {
  login: (credentials: { username: string; password: string }) =>
    apiClient.post(API_ENDPOINTS.auth.login, credentials),
  logout: () => apiClient.post(API_ENDPOINTS.auth.logout),
};

export const notificationApi = {
  sendNotification: (data: {
    title: string;
    message: string;
    priority: "info" | "error";
    topic: string;
  }) => apiClient.post(API_ENDPOINTS.notifications.send, data),
};
