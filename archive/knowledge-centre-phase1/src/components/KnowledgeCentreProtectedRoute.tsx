import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ServiceLibraryProtectedRoute } from "@/components/service-library/ServiceLibraryProtectedRoute";

/** Legacy wrapper — KC routes now use Service Library permissions and guards. */
export function KnowledgeCentreProtectedRoute({
  children,
  requireEdit = false,
}: {
  children: ReactNode;
  requireEdit?: boolean;
}) {
  return (
    <ServiceLibraryProtectedRoute requireManage={requireEdit}>{children}</ServiceLibraryProtectedRoute>
  );
}

/** Redirect /knowledge-centre/* to merged /service-library/* paths. */
export function KnowledgeCentreLegacyRedirect() {
  const loc = useLocation();
  const rest = loc.pathname.replace(/^\/knowledge-centre/, "");
  const target = rest ? `/service-library${rest}` : "/service-library";
  return <Navigate to={`${target}${loc.search}${loc.hash}`} replace />;
}
