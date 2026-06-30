import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { BootstrapLoading } from "@/components/BootstrapLoading";
import { AppProviders } from "@/AppProviders";
import { useAuth } from "@/contexts/AuthContext";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";

const AppRoutes = lazy(() => import("@/AppRoutes"));

function DeferredAppRoutes() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return <BootstrapLoading message="Loading workspace…" />;
  }

  if (!user && pathname === "/") {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Suspense fallback={<BootstrapLoading message="Loading app…" />}>
      <AppRoutes />
    </Suspense>
  );
}

export default function AppBootstrap() {
  return (
    <AppProviders>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<DeferredAppRoutes />} />
      </Routes>
    </AppProviders>
  );
}
