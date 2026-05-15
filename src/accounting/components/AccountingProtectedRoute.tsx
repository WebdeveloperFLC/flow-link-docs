import { ReactNode, useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountingAccess } from "../hooks/useAccountingAccess";
import { toast } from "sonner";

export const AccountingProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { loading, hasAccess } = useAccountingAccess();
  const loc = useLocation();
  const toasted = useRef(false);

  useEffect(() => {
    if (!loading && !authLoading && user && !hasAccess && !toasted.current) {
      toasted.current = true;
      toast.error("You don't have access to Accounting");
    }
  }, [loading, authLoading, user, hasAccess]);

  if (authLoading || (user && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" state={{ from: loc }} replace />;
  if (!hasAccess) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default AccountingProtectedRoute;