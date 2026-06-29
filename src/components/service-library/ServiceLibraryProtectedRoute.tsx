import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import {
  SERVICE_LIBRARY_ADMIN_ROLES,
  SERVICE_LIBRARY_VIEW_ROLES,
} from "@/lib/service-library/access";

type Props = {
  children: ReactNode;
  /** When true, only documentation/admin roles may access (admin console). */
  requireManage?: boolean;
};

export function ServiceLibraryProtectedRoute({ children, requireManage = false }: Props) {
  const { user, loading, hasRole, isClient } = useAuth();
  const loc = useLocation();
  const allowedRoles = requireManage ? SERVICE_LIBRARY_ADMIN_ROLES : SERVICE_LIBRARY_VIEW_ROLES;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: loc }} replace />;
  }

  if (hasRole(allowedRoles)) {
    return <>{children}</>;
  }

  if (isClient) {
    return <Navigate to="/portal" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="p-10 max-w-xl text-center space-y-3">
        <ShieldAlert className="size-10 mx-auto text-destructive" />
        <div className="text-lg font-semibold">Knowledge Centre is for staff only</div>
        <p className="text-sm text-muted-foreground">
          Counselling knowledge and internal service content is not available on your account. Contact your
          administrator if you need access.
        </p>
      </Card>
    </div>
  );
}
