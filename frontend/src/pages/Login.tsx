import { useState } from "react";
import { useAuth } from "@/core/hooks/useAuth";
import { Input } from "@/components/ui/input";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const success = await login(username, password);
      if (!success) {
        setError("Invalid username or password");
      }
    } catch (err) {
      setError("Invalid username or password");
    }
  };

  return (
    <div
      className="container mx-auto flex flex-col items-center justify-center py-10"
      data-testid="login-page"
    >
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl">
        <div className="overflow-hidden rounded-xl shadow-lg bg-white">
          {/* Header: 2 columns */}
          <div className="bg-indigo-50 px-6 py-4 flex flex-row items-center">
            <div className="flex-1">
              <h5
                className="text-indigo-600 font-semibold text-lg mb-1"
                data-testid="login-title"
              >
                Login
              </h5>
              <p className="text-gray-500 text-sm" data-testid="login-subtitle">
                Enter your credentials to login!
              </p>
            </div>
          </div>
          {/* Card Body */}
          <div className="p-6">
            {/* Login Form */}
            <form
              className="space-y-4"
              onSubmit={handleSubmit}
              data-testid="login-form"
            >
              {error && (
                <div
                  className="text-red-500 text-sm text-center font-medium bg-red-50 rounded-md py-2"
                  data-testid="login-error"
                >
                  {error}
                </div>
              )}
              <div>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  data-testid="username-input"
                />
              </div>
              <div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="password-input"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-200 mt-2"
                data-testid="login-button"
              >
                Login
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
