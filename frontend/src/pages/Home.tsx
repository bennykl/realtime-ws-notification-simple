import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/core/constants/routes";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50"
      data-testid="home-page"
    >
      <div
        className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow"
        data-testid="home-card"
      >
        <div>
          <h2
            className="mt-6 text-center text-3xl font-extrabold text-gray-900"
            data-testid="home-title"
          >
            Welcome to Real-time Notification System
          </h2>
          <p
            className="mt-2 text-center text-sm text-gray-600"
            data-testid="home-subtitle"
          >
            Please login to continue
          </p>
        </div>
        <div>
          <button
            onClick={() => navigate(ROUTES.LOGIN)}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            data-testid="login-button"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}
