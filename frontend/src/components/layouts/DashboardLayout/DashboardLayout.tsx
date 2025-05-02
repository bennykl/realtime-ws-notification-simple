import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/core/constants/routes";
import { useAuth } from "@/core/hooks/useAuth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { logout, username } = useAuth();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-poppins">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
          <div className="flex items-center">
            <span className="text-lg font-bold text-gray-900 tracking-tight">
              Notification System
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700 font-medium">
              {username}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-full bg-gray-100 hover:bg-gray-200 p-2 transition-colors"
              title="Logout"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full py-8 px-4">
        {children}
      </main>
      {/* Footer */}
      <footer className="bg-transparent text-center text-xs text-gray-400 py-4">
        2025 © Notification System. Design & Develop by You.
      </footer>
    </div>
  );
}
