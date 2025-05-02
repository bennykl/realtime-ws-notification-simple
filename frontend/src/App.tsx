import "./App.css";
import { NotificationProvider } from "@/features/notifications/contexts/NotificationContext";
import { Toaster } from "sonner";

function App() {
  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Toaster richColors position="top-right" />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
            Real-time Notifications
          </h1>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-gray-600 dark:text-gray-400">
              This is a demo of real-time notifications using WebSocket.
              Notifications will appear in the top-right corner.
            </p>
          </div>
        </main>
      </div>
    </NotificationProvider>
  );
}

export default App;
