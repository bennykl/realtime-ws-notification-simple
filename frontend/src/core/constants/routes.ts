export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  NOTIFICATIONS: "/notifications",
} as const;

export const PROTECTED_ROUTES = [ROUTES.NOTIFICATIONS] as const;
