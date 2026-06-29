import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { useModulePermission } from "@/hooks/useModulePermission";

export function KnowledgeCentreProtectedRoute({
  children,
  requireEdit = false,
}: {
  children: ReactNode;
  requireEdit?: boolean;
}) {
  const { user, loading, isAdmin, isClient } = useAuth();
  const { canView, canEdit, loading: permLoading } = useModulePermission("knowledge_centre");
  const loc = useLocation();

  if (loading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" state={{ from: loc }} replace />;
  if (isClient) return <Navigate to="/portal" replace />;

  const allowed = isAdmin || (requireEdit ? canEdit : canView);
  if (!allowed) {
    return (
      <AppLayout>
        <div className="p-8">
          <Card className="p-10 max-w-xl mx-auto text-center space-y-3">
            <ShieldAlert className="size-10 mx-auto text-destructive" />
            <div className="text-lg font-semibold">Knowledge Centre access restricted</div>
            <p className="text-sm text-muted-foreground">
              Ask an admin to grant <b>Knowledge Centre</b> access in Team &amp; roles → Permissions.
            </p>
          </Card>
        </div>
      </AppLayout>
    );
  }
  return <>{children}</>;
}
