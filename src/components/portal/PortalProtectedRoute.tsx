import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";

export const PortalProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, roles, loading } = useAuth();
  const loc = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/portal/auth" state={{ from: loc }} replace />;
  if (!roles.includes("client") && !roles.includes("admin")) {
    return <Navigate to="/portal/auth" replace />;
  }
  return <>{children}</>;
};