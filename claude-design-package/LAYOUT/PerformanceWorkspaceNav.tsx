import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  type PerformanceWorkspaceId,
  visibleWorkspaceSubLinks,
} from "@/incentives/lib/performanceWorkspaceNav";

type PerformanceWorkspaceNavProps = {
  workspace: PerformanceWorkspaceId;
  className?: string;
};

export function PerformanceWorkspaceNav({ workspace, className }: PerformanceWorkspaceNavProps) {
  const { pathname } = useLocation();
  const { isAdmin, hasRole } = useAuth();
  const links = visibleWorkspaceSubLinks(workspace, {
    isAdmin,
    hasRole: (roles) => hasRole(roles as never),
  });

  if (links.length <= 1) return null;

  return (
    <nav
      className={cn("flex flex-wrap gap-1 border-b pb-3 mb-4", className)}
      aria-label={`${workspace} workspace navigation`}
      data-testid={`performance-workspace-nav-${workspace}`}
    >
      {links.map(({ to, label, icon: Icon, end }) => {
        const active = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
