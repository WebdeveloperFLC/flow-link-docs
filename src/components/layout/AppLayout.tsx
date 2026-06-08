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
  Tag,
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
  Menu,
  X,
  Scale,
  ArrowLeftRight,
  ReceiptText,
  CreditCard,
  ShieldCheck,
  UserPlus,
  Snowflake,
  Flame,
  Megaphone,
  Calculator,
  Settings2,
  Gift,
  CalendarClock,
} from "lucide-react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import flcLogo from "@/assets/flc-logo.png";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { Topbar } from "@/components/layout/Topbar";
import { useAccountingAccess } from "@/accounting/hooks/useAccountingAccess";
import { useCan } from "@/accounting/hooks/usePermission";
import { useModulePermission } from "@/hooks/useModulePermission";
import { ThemeCustomizer } from "@/components/theme/ThemeCustomizer";
import { useTheme } from "@/components/theme/ThemeProvider";
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
};

const dashboardItem: NavItem = { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true };

const crmNav: NavItem[] = [
  { to: "/leads", icon: Flame, label: "Leads" },
  { to: "/leads/cold", icon: Snowflake, label: "Cold Pool" },
  { to: "/leads/new", icon: UserPlus, label: "+ New Lead" },
  { to: "/clients", icon: Users, label: "Clients" },
  { to: "/clients/new", icon: UserPlus, label: "+ New Client" },
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
    label: "Service Library",
    roles: ["admin", "administrator", "counselor", "documentation", "telecaller"],
  },

  { to: "/activity", icon: ScrollText, label: "Activity" },
  {
    to: "/assessment-admin",
    icon: ClipboardCheck,
    label: "Settle Abroad",
    roles: ["admin", "counselor", "telecaller", "documentation"],
  },
];

const incentivesNav: NavItem[] = [
  { to: "/incentives", icon: Wallet, label: "My Incentives" },
  { to: "/incentives/admin", icon: Calculator, label: "Incentives Admin", adminOnly: true },
  { to: "/incentives/plans", icon: Settings2, label: "Incentive Plans", adminOnly: true },
];

const walletNav: NavItem[] = [
  { to: "/incentives/give-discount", icon: Gift, label: "Give Discount" },
  { to: "/incentives/wallet-topups", icon: Wallet, label: "Wallet Top-ups", adminOnly: true },
  { to: "/incentives/period-close", icon: CalendarClock, label: "Period Close", adminOnly: true },
];

const offersNav: NavItem[] = [
  { to: "/offers-admin", icon: Tag, label: "Offers & discounts", adminOnly: true },
  { to: "/offers-analytics", icon: BarChart2, label: "Offer analytics", adminOnly: true },
];

const adminNav: NavItem[] = [
  { to: "/ai-help", icon: Sparkles, label: "AI Help" },
  { to: "/forms-library", icon: FileStack, label: "Forms library", adminOnly: true },
  { to: "/letter-templates", icon: Mail, label: "Letter templates", adminOnly: true },
  {
    to: "/service-library-admin",
    icon: ListChecks,
    label: "Service Library Admin",
    roles: ["admin", "administrator", "documentation"],
  },
  { to: "/team-access", icon: Share2, label: "Team access" },
  { to: "/users", icon: UserCog, label: "Team & roles", adminOnly: true },
  { to: "/masters", icon: Database, label: "Masters", adminOnly: true },
  { to: "/settings", icon: SettingsIcon, label: "Settings", adminOnly: true },
  { to: "/settings/telephony", icon: Phone, label: "Phone connect" },
  { to: "/settings/telephony-integration", icon: KeyRound, label: "Telephony Integration", adminOnly: true },
];

const accountingNav: NavItem[] = [
  { to: "/accounting", icon: LayoutDashboard, label: "Overview", end: true, section: "dashboard" },
  { to: "/accounting/journals", icon: BookOpen, label: "Journal entries", section: "journals" },
  { to: "/accounting/coa", icon: Layers, label: "Chart of accounts", section: "coa" },
  { to: "/accounting/bank-accounts", icon: Landmark, label: "Bank accounts", section: "bank" },
  { to: "/accounting/petty-cash", icon: Wallet, label: "Petty cash", section: "petty_cash" },
  { to: "/accounting/intercompany", icon: ArrowLeftRight, label: "Inter-company", section: "intercompany" },
  { to: "/accounting/reimbursements", icon: ReceiptText, label: "Reimbursements", section: "reimbursements" },
  { to: "/accounting/card-reconciliation", icon: CreditCard, label: "Statement reconciliation", section: "card_recon" },
  { to: "/accounting/owners", icon: Users, label: "Owner profiles", section: "owners" },
  { to: "/accounting/ap", icon: ArrowDownCircle, label: "AP — Bills", section: "ap" },
  { to: "/accounting/ar", icon: ArrowUpCircle, label: "AR — Invoices", section: "ar" },
  { to: "/accounting/vendors", icon: Truck, label: "Vendors", section: "vendors" },
  { to: "/accounting/clients", icon: Briefcase, label: "Clients", section: "clients_link" },
  { to: "/accounting/documents", icon: ScanLine, label: "Documents & OCR", section: "documents" },
  { to: "/accounting/approvals", icon: CheckSquare, label: "Approvals", section: "approvals" },
  { to: "/accounting/reports", icon: BarChart2, label: "Reports", section: "reports_financials" },
  { to: "/accounting/reports/trial-balance", icon: Scale, label: "Trial balance", section: "reports_financials" },
  { to: "/accounting/reports/general-ledger", icon: BookOpen, label: "General ledger", section: "reports_financials" },
  { to: "/accounting/reports/consolidated", icon: BarChart2, label: "Consolidated", section: "reports_consolidated" },
  {
    to: "/accounting/reports/reconciliation",
    icon: GitMerge,
    label: "Reports — Reconciliation",
    section: "reports_reconciliation",
  },
  { to: "/accounting/tax", icon: Receipt, label: "Tax & compliance", section: "tax" },
  { to: "/accounting/fraud", icon: ShieldAlert, label: "Fraud & audit", section: "fraud" },
  { to: "/accounting/reconciliation", icon: GitMerge, label: "Reconciliation", section: "reports_reconciliation" },
  { to: "/accounting/wealth", icon: PieChart, label: "Wealth summary", section: "owners" },
  { to: "/accounting/ai-assistant", icon: Sparkles, label: "AI assistant", section: "ai" },
  { to: "/accounting/settings/entities", icon: Building2, label: "Entities", section: "entities" },
  { to: "/accounting/settings/users", icon: UserCog, label: "Users", section: "users" },
  {
    to: "/accounting/access",
    icon: ShieldCheck,
    label: "Access management",
    section: "access_admin",
    acctAdminOnly: true,
  },
];

const institutionsNav: NavItem[] = [
  { to: "/institutions", icon: School, label: "Institutions", end: true },
  { to: "/institutions/review", icon: ListChecks, label: "Course Review" },
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
  const { user, roles, signOut, isAdmin, hasRole, isCommissionAdmin } = useAuth();
  const navigate = useNavigate();
  const primaryRole = roles[0] ?? "viewer";
  const { hasAccess: hasAccountingAccess, loading: accountingAccessLoading } = useAccountingAccess();
  const { can: canAcct, isAdmin: isAcctAdmin } = useCan();
  const { canView: canViewInstitutions } = useModulePermission("institutions");
  const { canView: canViewCommissions } = useModulePermission("commissions");
  const { canView: canViewDsh } = useModulePermission("digital_success_hub");
  const { guides: visibleGuides } = useVisibleGuides();
  const { theme } = useTheme();
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const location = useLocation();
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
  const renderSection = (key: NavSectionKey, title: string, items: NavItem[]) => {
    if (items.length === 0) return null;
    const hasActive = items.some(
      (i) => location.pathname === i.to || (!i.end && location.pathname.startsWith(i.to + "/")),
    );
    const isOpen = openSections[key] ?? hasActive;
    const sectionColor = theme.navSectionColors[key];

    if (iconsOnly) return <>{items.map(renderNavLink)}</>;

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
        {isOpen && <div className="space-y-1">{items.map(renderNavLink)}</div>}
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
              crmNav.filter((i) => (!i.adminOnly || isAdmin) && (!i.roles || isAdmin || hasRole(i.roles as never))),
            )}

            {renderSection("calendar", "Calendar", calendarNav)}

            {renderSection(
              "incentives",
              "Incentives",
              incentivesNav.filter(
                (i) => (!i.adminOnly || isAdmin) && (!i.roles || isAdmin || hasRole(i.roles as never)),
              ),
            )}

            {renderSection(
              "wallet",
              "Wallet",
              walletNav.filter((i) => (!i.adminOnly || isAdmin) && (!i.roles || isAdmin || hasRole(i.roles as never))),
            )}

            {renderSection(
              "offers",
              "Offers & Discounts",
              offersNav.filter((i) => (!i.adminOnly || isAdmin) && (!i.roles || isAdmin || hasRole(i.roles as never))),
            )}

            {(isAdmin || canViewDsh) && renderSection("digital", "Digital", digitalSuccessNav)}

            {(isAdmin || canViewInstitutions) && renderSection("institution", "Institution", institutionsNav)}

            {(isAdmin || isCommissionAdmin || canViewCommissions) &&
              renderSection("commissions", "Commissions", commissionsNav)}

            {renderSection("guide", "Guide", guideNav)}

            {!accountingAccessLoading &&
              hasAccountingAccess &&
              renderSection(
                "accounts",
                "Accounts",
                accountingNav.filter((i) => {
                  if (i.acctAdminOnly && !isAcctAdmin) return false;
                  if (!i.section) return true;
                  return canAcct(i.section, "view");
                }),
              )}

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
                      ROLE_COLORS[primaryRole],
                    )}
                  >
                    <Shield className="size-2.5 inline mr-1" />
                    {ROLE_LABELS[primaryRole]}
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

        <main
          key={typeof window !== "undefined" ? window.location.pathname : "main"}
          className={cn("flex-1 overflow-auto page-transition", theme.colorfulMode && "gradient-subtle")}
        >
          {children}
        </main>
        {/* Global enterprise topbar — always visible, top-right */}
        <Topbar />
        <ThemeCustomizer />
        <AiHelpDrawer />
      </div>
    </TooltipProvider>
  );
};
