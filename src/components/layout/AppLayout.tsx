import { ReactNode, useMemo, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ScrollText,
  LogOut,
  Shield,
  UserCog,
  Settings as SettingsIcon,
  Mail,
  Database,
  FileStack,
  Share2,
  GraduationCap,
  Phone,
  KeyRound,
  MessageSquare,
  MessageCircle,
  Headphones,
  ClipboardCheck,
  BookOpen,
  Library,
  Layers,
  ArrowDownCircle,
  ArrowUpCircle,
  ScanLine,
  CheckSquare,
  BarChart2,
  Receipt,
  ShieldAlert,
  GitMerge,
  PieChart,
  Sparkles,
  Truck,
  Briefcase,
  Building2,
  Landmark,
  Wallet,
  School,
  ListChecks,
  Lightbulb,
  Link2,
  Menu,
  X,
  Scale,
  ArrowLeftRight,
  ReceiptText,
  CreditCard,
  ShieldCheck,
  Snowflake,
  Flame,
  Megaphone,
  CalendarClock,
  Globe,
  Tags,
  ListFilter,
  Settings2,
} from "lucide-react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";
import { viewAsRoleLabel } from "@/lib/roleViewAs";
import { cn } from "@/lib/utils";
import flcLogo from "@/assets/flc-logo.png";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { Topbar } from "@/components/layout/Topbar";
import { useAccountingAccess } from "@/accounting/hooks/useAccountingAccess";
import { useCan } from "@/accounting/hooks/usePermission";
import { useModulePermission } from "@/hooks/useModulePermission";
import { ThemeCustomizer } from "@/components/theme/ThemeCustomizer";
import { useTheme } from "@/components/theme/ThemeProvider";
import { resolveThemeModeDark } from "@/lib/themeStore";
import { isPerformanceHubPath } from "@/lib/performanceHubTokens";
import { PerformanceHubContextBar } from "@/components/performance/PerformanceHubContextBar";
import {
  isPathInWorkspace,
  offersWorkspaceDefaultRoute,
  visiblePerformanceWorkspaceSidebar,
  type WorkspaceSidebarItem,
} from "@/incentives/lib/performanceWorkspaceNav";
import type { NavSectionKey } from "@/lib/themeStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AiHelpDrawer } from "@/ai-help/components/AiHelpDrawer";
import { useVisibleGuides } from "@/guides/hooks/useVisibleGuides";

type NavItem = {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  end?: boolean;
  adminOnly?: boolean;
  roles?: string[];
  section?: string;
  acctAdminOnly?: boolean;
  /** Finance-admin-only items grouped under Advanced finance (FOS Sprint 1). */
  advancedFinance?: boolean;
  hidden?: boolean;
};

/** Hidden until per-service eligibility is fully tested; route remains at /assessment-admin */
const SHOW_SETTLE_ABROAD_NAV = false;

const dashboardItem: NavItem = { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true };

const crmNav: NavItem[] = [
  { to: "/leads/cold", icon: Snowflake, label: "Cold Pool" },
  { to: "/leads", icon: Flame, label: "Current Leads" },
  { to: "/clients", icon: Users, label: "Clients" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
  {
    to: "/whatsapp",
    icon: MessageCircle,
    label: "WhatsApp",
    roles: ["admin", "administrator", "counselor", "telecaller", "documentation"],
  },
  { to: "/telecaller", icon: Headphones, label: "Telecaller", roles: ["telecaller", "admin", "counselor"] },
  { to: "/course-finder", icon: GraduationCap, label: "Course finder" },

  {
    to: "/service-library",
    icon: ListChecks,
    label: "Knowledge Centre",
    roles: ["admin", "administrator", "counselor", "documentation", "telecaller"],
  },

  { to: "/activity", icon: ScrollText, label: "Activity" },
  {
    to: "/assessment-admin",
    icon: ClipboardCheck,
    label: "Settle Abroad",
    roles: ["admin", "counselor", "telecaller", "documentation"],
    hidden: !SHOW_SETTLE_ABROAD_NAV,
  },
];

/** Phase 4A — business workspaces (sub-pages live inside each area) */
const renderPerformanceWorkspaceLinks = (
  items: WorkspaceSidebarItem[],
  locationPath: string,
  navItemClass: (isActive: boolean) => string,
  iconsOnly: boolean,
  ctx: { isAdmin: boolean; hasRole: (roles: readonly string[]) => boolean },
) => {
  const renderLink = (item: WorkspaceSidebarItem) => {
    const to =
      item.id === "offers-promotions" ? offersWorkspaceDefaultRoute(ctx) : item.to;
    const isActive = isPathInWorkspace(locationPath, item.id);
    const link = (
      <NavLink key={item.id} to={to} end={item.end} className={() => navItemClass(isActive)}>
        <item.icon className="size-4 shrink-0" />
        {!iconsOnly && <span className="truncate">{item.label}</span>}
      </NavLink>
    );
    if (!iconsOnly) return link;
    return (
      <Tooltip key={item.id} delayDuration={100}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  };
  return items.map(renderLink);
};

const hrPayrollNav: NavItem[] = [
  { to: "/hr", icon: Briefcase, label: "HR Payroll", end: true },
  { to: "/hr/employees", icon: Users, label: "Employee Master" },
  { to: "/hr/roles", icon: Shield, label: "Team & Roles (HR)", adminOnly: true },
];

const adminNav: NavItem[] = [
  { to: "/ai-help", icon: Sparkles, label: "AI Help" },
  { to: "/forms-library", icon: FileStack, label: "Forms library", adminOnly: true },
  { to: "/letter-templates", icon: Mail, label: "Letter templates", adminOnly: true },
  {
    to: "/service-library-admin",
    icon: ListChecks,
    label: "Knowledge Centre Admin",
    roles: ["admin", "administrator", "documentation"],
  },
  { to: "/team-access", icon: Share2, label: "Team access" },
  { to: "/users", icon: UserCog, label: "Team & roles", adminOnly: true },
  { to: "/masters", icon: Database, label: "Masters", adminOnly: true },
  { to: "/settings", icon: SettingsIcon, label: "Settings", adminOnly: true },
  { to: "/settings/telephony", icon: Phone, label: "Phone connect" },
  { to: "/settings/telephony-integration", icon: KeyRound, label: "Telephony Integration", adminOnly: true },
];

/** Day-to-day finance — business-friendly labels (routes unchanged). */
const accountingNavMain: NavItem[] = [
  { to: "/accounting", icon: LayoutDashboard, label: "Overview", end: true, section: "dashboard" },
  { to: "/accounting/finance-queue", icon: CheckSquare, label: "Finance queue", section: "approvals" },
  { to: "/accounting/ar", icon: ArrowUpCircle, label: "Client invoices", section: "ar" },
  { to: "/accounting/trust", icon: Wallet, label: "Client funds held", section: "trust" },
  { to: "/accounting/ap", icon: ArrowDownCircle, label: "Vendor bills", section: "ap" },
  { to: "/accounting/bank-accounts", icon: Landmark, label: "Bank accounts", section: "bank" },
  { to: "/accounting/petty-cash", icon: Wallet, label: "Petty cash", section: "petty_cash" },
  { to: "/accounting/reimbursements", icon: ReceiptText, label: "Reimbursements", section: "reimbursements" },
  { to: "/accounting/card-reconciliation", icon: CreditCard, label: "Card reconciliation", section: "card_recon" },
  { to: "/accounting/payroll", icon: Users, label: "Payroll", section: "payroll" },
  { to: "/accounting/vendors", icon: Truck, label: "Vendors", section: "vendors" },
  { to: "/accounting/clients", icon: Briefcase, label: "Clients", section: "clients_link" },
  { to: "/accounting/documents", icon: ScanLine, label: "Documents & OCR", section: "documents" },
  { to: "/accounting/approvals", icon: CheckSquare, label: "Approvals", section: "approvals" },
  { to: "/accounting/reports", icon: BarChart2, label: "Financial reports", section: "reports_financials" },
  {
    to: "/accounting/reports/reconciliation",
    icon: GitMerge,
    label: "Report reconciliation",
    section: "reports_reconciliation",
  },
  { to: "/accounting/reports/payment-purpose", icon: ListFilter, label: "Payment purpose", section: "payment_purpose_report" },
  { to: "/accounting/tax", icon: Receipt, label: "Tax & compliance", section: "tax" },
  { to: "/accounting/reconciliation", icon: GitMerge, label: "Bank reconciliation", section: "reports_reconciliation" },
];

/** Finance-admin setup — COA, journals, fiscal year, opening balances, GL (FOS Sprint 1). */
const accountingNavAdvanced: NavItem[] = [
  { to: "/accounting/coa", icon: Layers, label: "Account setup", section: "coa", advancedFinance: true },
  { to: "/accounting/journals", icon: BookOpen, label: "Journal entries", section: "journals", advancedFinance: true },
  { to: "/accounting/reports/general-ledger", icon: BookOpen, label: "General ledger", section: "reports_financials", advancedFinance: true },
  { to: "/accounting/reports/trial-balance", icon: Scale, label: "Trial balance", section: "reports_financials", advancedFinance: true },
  { to: "/accounting/reports/consolidated", icon: BarChart2, label: "Consolidated reports", section: "reports_consolidated", advancedFinance: true },
  { to: "/accounting/settings/entities", icon: Building2, label: "Companies & fiscal year", section: "entities", advancedFinance: true },
  { to: "/accounting/settings/collection-categories", icon: Tags, label: "Payment purpose setup", section: "collection_categories", acctAdminOnly: true, advancedFinance: true },
  { to: "/accounting/intercompany", icon: ArrowLeftRight, label: "Inter-company", section: "intercompany", advancedFinance: true },
  { to: "/accounting/owners", icon: Users, label: "Owner profiles", section: "owners", advancedFinance: true },
  { to: "/accounting/wealth", icon: PieChart, label: "Wealth summary", section: "owners", advancedFinance: true },
  { to: "/accounting/fraud", icon: ShieldAlert, label: "Fraud & audit", section: "fraud", advancedFinance: true },
  { to: "/accounting/ai-assistant", icon: Sparkles, label: "AI assistant", section: "ai", advancedFinance: true },
  { to: "/accounting/settings/platform-config", icon: Settings2, label: "Platform workflows", section: "users", acctAdminOnly: true, advancedFinance: true },
  { to: "/accounting/settings/users", icon: UserCog, label: "Accounting users", section: "users", advancedFinance: true },
  { to: "/accounting/access", icon: ShieldCheck, label: "Access management", section: "access_admin", acctAdminOnly: true, advancedFinance: true },
];

function filterAccountingNavItem(i: NavItem, canAcct: (section: string, level?: "view" | "edit" | "delete") => boolean, isAcctAdmin: boolean) {
  if (i.advancedFinance && !isAcctAdmin) return false;
  if (i.acctAdminOnly && !isAcctAdmin) return false;
  if (!i.section) return true;
  return canAcct(i.section, "view");
}

const institutionsNav: NavItem[] = [
  { to: "/institutions", icon: School, label: "Institutions", end: true },
  { to: "/institutions/review", icon: ListChecks, label: "Program Workspace" },
  { to: "/institutions/linkage", icon: Link2, label: "CF ↔ UPI Linkage" },
  { to: "/institutions/suggestions", icon: Lightbulb, label: "AI Suggestions" },
];

const commissionsNav: NavItem[] = [{ to: "/commissions", icon: Receipt, label: "Commissions", end: true }];

const digitalSuccessNav: NavItem[] = [
  { to: "/digital-success", icon: Megaphone, label: "Digital Success Hub", end: true },
];

const calendarNav: NavItem[] = [
  { to: "/calendar", icon: CalendarClock, label: "Calendar", end: true },
  { to: "/calendar/settings", icon: SettingsIcon, label: "Availability & Settings" },
  { to: "/calendar/approvals", icon: ClipboardCheck, label: "Approvals" },
  { to: "/calendar/analytics", icon: BarChart2, label: "Analytics" },
  { to: "/calendar/reports", icon: FileStack, label: "Reports" },
  { to: "/calendar/activity", icon: ScrollText, label: "Activity" },
];

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, roles, signOut, isAdmin, hasRole, isCommissionAdmin, viewAsRole, isPlatformOwner } = useAuth();
  const navigate = useNavigate();
  const primaryRole = roles[0] ?? "viewer";
  const roleBadgeLabel = viewAsRole
    ? `Preview · ${viewAsRoleLabel(viewAsRole)}`
    : isPlatformOwner
      ? "Owner"
      : ROLE_LABELS[primaryRole] ?? primaryRole;
  const { hasAccess: hasAccountingAccess, loading: accountingAccessLoading } = useAccountingAccess();
  const { can: canAcct, isAdmin: isAcctAdmin } = useCan();
  const { canView: canViewInstitutions } = useModulePermission("institutions");
  const { canView: canViewCommissions } = useModulePermission("commissions");
  const { canView: canViewDsh } = useModulePermission("digital_success_hub");
  const { canView: canViewHrPayroll } = useModulePermission("hr_payroll");
  const { guides: visibleGuides } = useVisibleGuides();
  const { theme } = useTheme();
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const location = useLocation();
  const isPerformanceHub = isPerformanceHubPath(location.pathname);
  const sidebarMode = theme.sidebarMode;
  const iconsOnly = sidebarMode === "icons-only";
  const isHidden = sidebarMode === "hidden";
  const sidebarBg = theme.sidebarStyle === "gradient" ? theme.sidebarGradient : undefined;

  const guideNav = useMemo<NavItem[]>(
    () => [
      { to: "/guides", icon: Library, label: "All Staff Guides", end: true },
      ...visibleGuides.map((g) => ({
        to: `/guides/${g.slug}`,
        icon: BookOpen,
        label: g.navLabel,
      })),
    ],
    [visibleGuides],
  );

  // which collapsible sections are open (multiple allowed). null = not yet initialised.
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const performanceWorkspaceItems = visiblePerformanceWorkspaceSidebar({
    isAdmin,
    hasRole: (roles) => hasRole(roles as never),
  });

  const navItemClass = (isActive: boolean) =>
    cn(
      "flex items-center rounded-lg text-sm font-medium transition-all",
      iconsOnly ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
      isActive
        ? "nav-item-active bg-sidebar-accent text-sidebar-accent-foreground shadow-elev-sm"
        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white",
    );

  const renderNavLink = (item: NavItem) => {
    const link = (
      <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => navItemClass(isActive)}>
        <item.icon className="size-4 shrink-0" />
        {!iconsOnly && <span className="truncate">{item.label}</span>}
      </NavLink>
    );
    if (!iconsOnly) return link;
    return (
      <Tooltip key={item.to} delayDuration={100}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  };

  // A collapsible section: header toggles open/close; auto-opens if it holds the active route.
  const renderSection = (
    key: NavSectionKey,
    title: string,
    items: NavItem[],
    customLinks?: ReactNode,
  ) => {
    if (items.length === 0 && !customLinks) return null;
    const hasActive =
      items.some(
        (i) => location.pathname === i.to || (!i.end && location.pathname.startsWith(i.to + "/")),
      ) ||
      Boolean(
        customLinks &&
          performanceWorkspaceItems.some((item) => isPathInWorkspace(location.pathname, item.id)),
      );
    const isOpen = openSections[key] ?? hasActive;
    const sectionColor = theme.navSectionColors[key];

    if (iconsOnly) {
      return (
        <>
          {items.map(renderNavLink)}
          {customLinks}
        </>
      );
    }

    return (
      <div>
        <div className="border-t border-sidebar-border my-2" />
        <button
          type="button"
          onClick={() => toggleSection(key)}
          className={cn(
            "w-full flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest px-3 py-2 hover:text-white transition-colors",
            theme.colorfulMode ? "text-sidebar-foreground/80" : "text-sidebar-foreground/60",
          )}
          style={
            theme.colorfulMode
              ? { borderLeft: `3px solid hsl(${sectionColor})`, marginLeft: 4, paddingLeft: 8 }
              : undefined
          }
        >
          <span>{title}</span>
          <ChevronDown className={cn("size-3.5 transition-transform", isOpen ? "" : "-rotate-90")} />
        </button>
        {isOpen && (
          <div className="space-y-1">
            {items.map(renderNavLink)}
            {customLinks}
          </div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen flex bg-background">
        {isHidden && (
          <button
            type="button"
            onClick={() => setHiddenOpen(true)}
            aria-label="Open navigation"
            className="fixed top-3 left-3 z-40 flex h-9 w-9 items-center justify-center rounded-md bg-sidebar text-sidebar-foreground shadow-md border border-sidebar-border"
          >
            <Menu className="size-4" />
          </button>
        )}
        {isHidden && hiddenOpen && (
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setHiddenOpen(false)} />
        )}
        <aside
          className={cn(
            "bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-all duration-200",
            iconsOnly ? "w-14" : "w-64",
            isHidden && "fixed top-0 left-0 bottom-0 z-50 w-64",
            isHidden && !hiddenOpen && "-translate-x-full",
          )}
          style={sidebarBg ? { background: sidebarBg } : undefined}
        >
          <div
            className={cn(
              "border-b border-sidebar-border bg-white flex items-center justify-between",
              iconsOnly ? "px-2 py-3" : "px-4 py-5",
            )}
          >
            <img
              src={flcLogo}
              alt="Future Link Consultants"
              className={cn("object-contain", iconsOnly ? "h-8 w-8" : "w-full h-auto max-h-16")}
            />
            {isHidden && (
              <button
                type="button"
                onClick={() => setHiddenOpen(false)}
                aria-label="Close navigation"
                className="text-foreground/60 hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {/* Dashboard pinned at top */}
            {renderNavLink(dashboardItem)}

            {renderSection(
              "crm",
              "CRM",
              crmNav.filter(
                (i) =>
                  !i.hidden &&
                  (!i.adminOnly || isAdmin) &&
                  (!i.roles || isAdmin || hasRole(i.roles as never)),
              ),
            )}

            {renderSection("calendar", "Calendar", calendarNav)}

            {renderSection(
              "performance",
              "Performance Hub",
              [],
              renderPerformanceWorkspaceLinks(
                performanceWorkspaceItems,
                location.pathname,
                navItemClass,
                iconsOnly,
                { isAdmin, hasRole: (roles) => hasRole(roles as never) },
              ),
            )}

            {(isAdmin || canViewDsh) && renderSection("digital", "Digital", digitalSuccessNav)}

            {(isAdmin || canViewInstitutions) && renderSection("institution", "Institution", institutionsNav)}

            {(isAdmin || isCommissionAdmin || canViewCommissions) &&
              renderSection("commissions", "Commissions", commissionsNav)}

            {(isAdmin || canViewHrPayroll) &&
              renderSection(
                "hr_payroll",
                "HR Payroll",
                hrPayrollNav.filter(
                  (i) => (!i.adminOnly || isAdmin) && (!i.roles || isAdmin || hasRole(i.roles as never)),
                ),
              )}

            {renderSection("guide", "Guide", guideNav)}

            {!accountingAccessLoading &&
              hasAccountingAccess &&
              (() => {
                const mainItems = accountingNavMain.filter((i) =>
                  filterAccountingNavItem(i, canAcct, isAcctAdmin),
                );
                const advancedItems = isAcctAdmin
                  ? accountingNavAdvanced.filter((i) => filterAccountingNavItem(i, canAcct, isAcctAdmin))
                  : [];
                const allItems = [...mainItems, ...advancedItems];
                if (allItems.length === 0) return null;

                const hasActive = allItems.some(
                  (i) =>
                    location.pathname === i.to ||
                    (!i.end && location.pathname.startsWith(i.to + "/")),
                );
                const isOpen = openSections.accounts ?? hasActive;
                const sectionColor = theme.navSectionColors.accounts;

                if (iconsOnly) {
                  return (
                    <>
                      {allItems.map(renderNavLink)}
                    </>
                  );
                }

                return (
                  <div>
                    <div className="border-t border-sidebar-border my-2" />
                    <button
                      type="button"
                      onClick={() => toggleSection("accounts")}
                      className={cn(
                        "w-full flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest px-3 py-2 hover:text-white transition-colors",
                        theme.colorfulMode ? "text-sidebar-foreground/80" : "text-sidebar-foreground/60",
                      )}
                      style={
                        theme.colorfulMode
                          ? { borderLeft: `3px solid hsl(${sectionColor})`, marginLeft: 4, paddingLeft: 8 }
                          : undefined
                      }
                    >
                      <span>Finance</span>
                      <ChevronDown className={cn("size-3.5 transition-transform", isOpen ? "" : "-rotate-90")} />
                    </button>
                    {isOpen && (
                      <div className="space-y-1">
                        {mainItems.map(renderNavLink)}
                        {advancedItems.length > 0 && (
                          <>
                            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                              Advanced finance
                            </div>
                            {advancedItems.map(renderNavLink)}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

            {renderSection(
              "admin",
              "Admin & Setup",
              adminNav.filter((i) => (!i.adminOnly || isAdmin) && (!i.roles || isAdmin || hasRole(i.roles as never))),
            )}
          </nav>

          <div className={cn("border-t border-sidebar-border space-y-2", iconsOnly ? "p-2" : "p-3")}>
            {!iconsOnly && (
              <div className="px-3 py-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
                  <div
                    className={cn(
                      "inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                      viewAsRole
                        ? "bg-amber-500/20 text-amber-100 border border-amber-400/40"
                        : ROLE_COLORS[primaryRole],
                    )}
                  >
                    <Shield className="size-2.5 inline mr-1" />
                    {roleBadgeLabel}
                  </div>
                </div>
                {/* Handoff notifications now delivered via app_notifications → NotificationCenter in Topbar */}
              </div>
            )}
            {iconsOnly ? (
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
                    onClick={async () => {
                      await signOut();
                      navigate("/auth");
                    }}
                  >
                    <LogOut className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
                onClick={async () => {
                  await signOut();
                  navigate("/auth");
                }}
              >
                <LogOut className="size-4 mr-2" />
                Sign out
              </Button>
            )}
          </div>
        </aside>

        {/* DO NOT add key={pathname} here — remounts the whole page on every nav click and causes
            removeChild crashes with Radix portals (Select/Dropdown) and charts. See FIN-R-001. */}
        <main
          className={cn("flex-1 overflow-auto page-transition", theme.colorfulMode && !isPerformanceHub && "gradient-subtle")}
        >
          {isPerformanceHub ? (
            <div
              data-performance-hub
              data-theme={resolveThemeModeDark(theme.mode) ? "dark" : "light"}
              className="min-h-full flex flex-col"
            >
              <PerformanceHubContextBar />
              <div className="flex-1">{children}</div>
            </div>
          ) : (
            children
          )}
        </main>
        {/* Global enterprise topbar — always visible, top-right */}
        <Topbar />
        <ThemeCustomizer />
        <AiHelpDrawer />
      </div>
    </TooltipProvider>
  );
};
