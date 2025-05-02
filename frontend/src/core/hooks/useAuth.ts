import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/core/constants/routes";
import { useAuthStore } from "@/store/authStore";
import { ENV } from "../config/env";

interface LoginResponse {
  access_token: string;
  token_type: string;
}

export function useAuth() {
  const navigate = useNavigate();
  const { isAuthenticated, setToken, clearToken, username, setUsername } =
    useAuthStore();

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      console.log("Attempting login...");
      const response = await fetch(ENV.API_URL + "/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = (await response.json()) as LoginResponse;
      console.log("Login response:", data);

      setToken(data.access_token);
      console.log("Setting username:", username);
      setUsername(username);
      console.log("Setting isAuthenticated to true");
      console.log("Navigating to:", ROUTES.NOTIFICATIONS);
      navigate(ROUTES.NOTIFICATIONS);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = (): void => {
    clearToken();
    navigate(ROUTES.LOGIN);
  };

  return {
    isAuthenticated,
    username,
    login,
    logout,
  };
}
