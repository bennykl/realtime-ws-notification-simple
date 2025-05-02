import { NotificationForm } from "@/components/notifications/NotificationForm";

export function Notifications() {
  return (
    <div className="min-h-screen bg-gray-50 font-poppins">
      <div className="container mx-auto py-10">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-2xl">
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-xl font-semibold mb-2 text-gray-900">
                Send Notification
              </h2>
              <p className="text-gray-500 mb-6 text-sm">
                Kirim notifikasi real-time ke user dengan prioritas dan
                kategori.
              </p>
              <NotificationForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
