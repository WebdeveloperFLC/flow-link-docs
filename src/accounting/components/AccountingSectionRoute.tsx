import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { AccountingProtectedRoute } from "./AccountingProtectedRoute";
import { usePermission, AcctSectionKey, AcctLevel } from "../hooks/usePermission";

interface Props {
  section: AcctSectionKey;
  level?: AcctLevel;
  children: ReactNode;
}

/** Combines accounting access + per-section permission. */
export default function AccountingSectionRoute({ section, level = "view", children }: Props) {
  return (
    <AccountingProtectedRoute>
      <SectionGate section={section} level={level}>{children}</SectionGate>
    </AccountingProtectedRoute>
  );
}

function SectionGate({ section, level, children }: { section: AcctSectionKey; level: AcctLevel; children: ReactNode }) {
  const { allowed, loading } = usePermission(section, level);
  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!allowed) return <Navigate to={`/accounting/no-access?section=${encodeURIComponent(section)}&level=${level}`} replace />;
  return <>{children}</>;
}