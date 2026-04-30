import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Workflow, ScrollText, LogOut, Shield, FileText, UserCog, Settings as SettingsIcon, Mail, Database, FileStack } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type NavItem = { to: string; icon: typeof LayoutDashboard; label: string; end?: boolean; adminOnly?: boolean };

const nav: NavItem[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/clients", icon: Users, label: "Clients" },
  { to: "/templates", icon: Workflow, label: "Workflows" },
  { to: "/forms-library", icon: FileStack, label: "Forms library", adminOnly: true },
  { to: "/letter-templates", icon: Mail, label: "Letter templates", adminOnly: true },
  { to: "/activity", icon: ScrollText, label: "Activity" },
  { to: "/users", icon: UserCog, label: "Team & roles", adminOnly: true },
  { to: "/masters", icon: Database, label: "Masters", adminOnly: true },
  { to: "/settings", icon: SettingsIcon, label: "Settings", adminOnly: true },
];

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, roles, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const primaryRole = roles[0] ?? "viewer";

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg gradient-accent flex items-center justify-center shadow-elev-md">
              <FileText className="size-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight">Future Link</div>
              <div className="text-[10px] text-sidebar-foreground/70 uppercase tracking-wider">DMS</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.filter((i) => !i.adminOnly || isAdmin).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-elev-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white"
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="px-3 py-2">
            <div className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
            <div className={cn("inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider", ROLE_COLORS[primaryRole])}>
              <Shield className="size-2.5 inline mr-1" />
              {ROLE_LABELS[primaryRole]}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
            onClick={async () => { await signOut(); navigate("/auth"); }}
          >
            <LogOut className="size-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
};