import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Workflow, ScrollText, LogOut, Shield, UserCog, Settings as SettingsIcon, Mail, Database, FileStack, Share2, GraduationCap, Phone, KeyRound, MessageSquare, Headphones, Tag, ClipboardCheck, BookOpen, Layers, ArrowDownCircle, ArrowUpCircle, ScanLine, CheckSquare, BarChart2, Receipt, ShieldAlert, GitMerge, PieChart, Sparkles, Truck, Briefcase, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import flcLogo from "@/assets/flc-logo.png";
import { HandoffBell } from "@/components/notifications/HandoffBell";

type NavItem = { to: string; icon: typeof LayoutDashboard; label: string; end?: boolean; adminOnly?: boolean; roles?: string[] };

const nav: NavItem[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/clients", icon: Users, label: "Clients" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
  { to: "/telecaller", icon: Headphones, label: "Telecaller", roles: ["telecaller", "admin", "counselor"] },
  { to: "/course-finder", icon: GraduationCap, label: "Course finder" },
  { to: "/templates", icon: Workflow, label: "Workflows" },
  { to: "/forms-library", icon: FileStack, label: "Forms library", adminOnly: true },
  { to: "/letter-templates", icon: Mail, label: "Letter templates", adminOnly: true },
  { to: "/activity", icon: ScrollText, label: "Activity" },
  { to: "/team-access", icon: Share2, label: "Team access" },
  { to: "/users", icon: UserCog, label: "Team & roles", adminOnly: true },
  { to: "/offers-admin", icon: Tag, label: "Offers & discounts", adminOnly: true },
  { to: "/assessment-admin", icon: ClipboardCheck, label: "Settle Abroad", roles: ["admin", "counselor", "telecaller", "documentation"] },
  { to: "/masters", icon: Database, label: "Masters", adminOnly: true },
  { to: "/settings", icon: SettingsIcon, label: "Settings", adminOnly: true },
  { to: "/settings/telephony", icon: Phone, label: "Phone connect" },
  { to: "/settings/telephony-integration", icon: KeyRound, label: "Telephony Integration", adminOnly: true },
];

const accountingNav: NavItem[] = [
  { to: "/accounting", icon: LayoutDashboard, label: "Overview", end: true },
  { to: "/accounting/journals", icon: BookOpen, label: "Journal entries" },
  { to: "/accounting/coa", icon: Layers, label: "Chart of accounts" },
  { to: "/accounting/bank-accounts", icon: Landmark, label: "Bank accounts" },
  { to: "/accounting/owners", icon: Users, label: "Owner profiles" },
  { to: "/accounting/ap", icon: ArrowDownCircle, label: "AP — Bills" },
  { to: "/accounting/ar", icon: ArrowUpCircle, label: "AR — Invoices" },
  { to: "/accounting/vendors", icon: Truck, label: "Vendors" },
  { to: "/accounting/clients", icon: Briefcase, label: "Clients" },
  { to: "/accounting/documents", icon: ScanLine, label: "Documents & OCR" },
  { to: "/accounting/approvals", icon: CheckSquare, label: "Approvals" },
  { to: "/accounting/reports", icon: BarChart2, label: "Reports" },
  { to: "/accounting/tax", icon: Receipt, label: "Tax & compliance" },
  { to: "/accounting/fraud", icon: ShieldAlert, label: "Fraud & audit" },
  { to: "/accounting/reconciliation", icon: GitMerge, label: "Reconciliation" },
  { to: "/accounting/wealth", icon: PieChart, label: "Wealth summary" },
  { to: "/accounting/ai-assistant", icon: Sparkles, label: "AI assistant" },
  { to: "/accounting/settings/entities", icon: Building2, label: "Entities" },
  { to: "/accounting/settings/users", icon: UserCog, label: "Users & roles" },
];

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, roles, signOut, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  const primaryRole = roles[0] ?? "viewer";

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="px-4 py-5 border-b border-sidebar-border bg-white">
          <img
            src={flcLogo}
            alt="Future Link Consultants"
            className="w-full h-auto max-h-16 object-contain"
          />
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav
            .filter((i) => (!i.adminOnly || isAdmin) && (!i.roles || isAdmin || hasRole(i.roles as never)))
            .map((item) => (
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

          <div className="border-t border-sidebar-border my-2" />
          <div className="text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/60 px-3 py-2">
            Accounting
          </div>
          {accountingNav.map((item) => (
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
          <div className="px-3 py-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
              <div className={cn("inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider", ROLE_COLORS[primaryRole])}>
                <Shield className="size-2.5 inline mr-1" />
                {ROLE_LABELS[primaryRole]}
              </div>
            </div>
            <HandoffBell />
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