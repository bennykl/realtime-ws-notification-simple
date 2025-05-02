import { Routes, Route } from "react-router-dom";
import { ROUTES } from "@/core/constants/routes";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import { Notifications } from "@/pages/Notifications";
import AuthLayout from "@/components/layouts/AuthLayout/AuthLayout";
import DashboardLayout from "@/components/layouts/DashboardLayout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<Home />} />
      <Route path={ROUTES.LOGIN} element={<AuthLayout />}>
        <Route index element={<Login />} />
      </Route>
      <Route
        path={ROUTES.NOTIFICATIONS}
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Notifications />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
