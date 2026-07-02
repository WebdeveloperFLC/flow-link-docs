import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BarChart2,
  BookOpen,
  Calculator,
  CalendarClock,
  ClipboardCheck,
  Coins,
  Combine,
  Database,
  DollarSign,
  FileText,
  FlaskConical,
  Gift,
  GitMerge,
  Layers,
  LayoutGrid,
  Link2,
  Megaphone,
  Plug,
  Receipt,
  ScanLine,
  Settings as SettingsIcon,
  Settings2,
  Shield,
  Trophy,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

/** Phase 4A — business-oriented Performance Hub workspaces */
export type PerformanceWorkspaceId =
  | "dashboard"
  | "discounts-wallets"
  | "offers-promotions"
  | "incentives-payouts"
  | "teams-performance"
  | "analytics-reports"
  | "finance-profitability"
  | "administration";

export type WorkspaceNavContext = {
  isAdmin: boolean;
  hasRole: (roles: readonly string[]) => boolean;
};

export type WorkspaceSidebarItem = {
  id: PerformanceWorkspaceId;
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  adminOnly?: boolean;
  roles?: readonly string[];
};

export type WorkspaceSubLink = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  adminOnly?: boolean;
  roles?: readonly string[];
  /** Counselors see only links without this flag */
  hideFromCounselor?: boolean;
};

function matchesPrefix(pathname: string, prefix: string, exact = false): boolean {
  if (exact) return pathname === prefix;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Whether a pathname belongs to a workspace (sidebar highlight). */
export function isPathInWorkspace(pathname: string, workspaceId: PerformanceWorkspaceId): boolean {
  switch (workspaceId) {
    case "dashboard":
      return (
        pathname === "/performance" ||
        matchesPrefix(pathname, "/performance/how-it-works") ||
        matchesPrefix(pathname, "/performance/executive") ||
        pathname === "/performance/admin"
      );
    case "discounts-wallets":
      return (
        matchesPrefix(pathname, "/performance/wallets") ||
        matchesPrefix(pathname, "/performance/give-discount") ||
        matchesPrefix(pathname, "/performance/client-commercials") ||
        matchesPrefix(pathname, "/performance/wallet") ||
        matchesPrefix(pathname, "/performance/combinations") ||
        matchesPrefix(pathname, "/incentives/wallet-topups") ||
        matchesPrefix(pathname, "/incentives/period-close") ||
        matchesPrefix(pathname, "/incentives/give-discount")
      );
    case "offers-promotions":
      return matchesPrefix(pathname, "/performance/offers");
    case "incentives-payouts":
      return (
        matchesPrefix(pathname, "/performance/incentives") ||
        matchesPrefix(pathname, "/performance/approvals") ||
        matchesPrefix(pathname, "/incentives/plans") ||
        matchesPrefix(pathname, "/incentives/admin") ||
        matchesPrefix(pathname, "/incentives/payouts") ||
        matchesPrefix(pathname, "/incentives/competitions") ||
        matchesPrefix(pathname, "/incentives/simulator") ||
        matchesPrefix(pathname, "/incentives/runs") ||
        pathname === "/incentives"
      );
    case "teams-performance":
      return (
        matchesPrefix(pathname, "/performance/team") ||
        matchesPrefix(pathname, "/performance/compare") ||
        matchesPrefix(pathname, "/performance/admin/unclassified")
      );
    case "analytics-reports":
      return (
        matchesPrefix(pathname, "/performance/analytics") ||
        matchesPrefix(pathname, "/performance/reports")
      );
    case "finance-profitability":
      return (
        matchesPrefix(pathname, "/performance/finance") ||
        matchesPrefix(pathname, "/performance/profitability") ||
        matchesPrefix(pathname, "/performance/commissions") ||
        matchesPrefix(pathname, "/performance/multi-currency") ||
        matchesPrefix(pathname, "/incentives/fx-rates")
      );
    case "administration":
      return (
        matchesPrefix(pathname, "/performance/configuration") ||
        matchesPrefix(pathname, "/performance/roles") ||
        matchesPrefix(pathname, "/performance/audit-trail") ||
        matchesPrefix(pathname, "/performance/crm-integration") ||
        matchesPrefix(pathname, "/performance/architecture") ||
        matchesPrefix(pathname, "/performance/admin/approvals")
      );
    default:
      return false;
  }
}

export function isWorkspaceSidebarVisible(item: WorkspaceSidebarItem, ctx: WorkspaceNavContext): boolean {
  if (item.adminOnly && !ctx.isAdmin) return false;
  if (item.roles && !ctx.isAdmin && !ctx.hasRole(item.roles)) return false;
  return isWorkspaceVisible(item.id, ctx);
}

export function isWorkspaceVisible(workspaceId: PerformanceWorkspaceId, ctx: WorkspaceNavContext): boolean {
  const { isAdmin, hasRole } = ctx;

  switch (workspaceId) {
    case "dashboard":
    case "discounts-wallets":
      return true;
    case "offers-promotions":
      return isAdmin || hasRole(["manager", "administrator", "counselor", "director", "viewer"]);
    case "incentives-payouts":
      return isAdmin || hasRole(["manager", "administrator", "director", "viewer", "commission_admin"]);
    case "teams-performance":
      return isAdmin || hasRole(["manager", "administrator", "director", "viewer"]);
    case "analytics-reports":
      return isAdmin || hasRole(["manager", "administrator", "director", "viewer"]);
    case "finance-profitability":
      return isAdmin || hasRole(["director", "viewer", "manager", "commission_admin"]);
    case "administration":
      return isAdmin || hasRole(["manager", "administrator", "director", "viewer"]);
    default:
      return false;
  }
}

export function isWorkspaceSubLinkVisible(link: WorkspaceSubLink, ctx: WorkspaceNavContext): boolean {
  if (link.adminOnly && !ctx.isAdmin) return false;
  if (link.roles && !ctx.isAdmin && !ctx.hasRole(link.roles)) return false;
  if (link.hideFromCounselor) {
    const isCounselorOnly =
      ctx.hasRole(["counselor"]) &&
      !ctx.isAdmin &&
      !ctx.hasRole(["manager", "administrator", "director", "viewer", "commission_admin"]);
    if (isCounselorOnly) return false;
  }
  return true;
}

export const PERFORMANCE_WORKSPACE_SIDEBAR: WorkspaceSidebarItem[] = [
  { id: "dashboard", to: "/performance", icon: LayoutGrid, label: "Dashboard", end: true },
  { id: "discounts-wallets", to: "/performance/wallets", icon: Wallet, label: "Discounts & Wallets" },
  {
    id: "offers-promotions",
    to: "/performance/offers",
    icon: Megaphone,
    label: "Offers & Promotions",
    roles: ["manager", "admin", "administrator", "counselor", "director", "viewer"],
  },
  {
    id: "incentives-payouts",
    to: "/performance/incentives/payouts",
    icon: Banknote,
    label: "Incentives & Payouts",
    roles: ["manager", "admin", "administrator", "director", "viewer", "commission_admin"],
  },
  {
    id: "teams-performance",
    to: "/performance/team",
    icon: Users,
    label: "Teams & Performance",
    roles: ["manager", "admin", "administrator", "director", "viewer"],
  },
  {
    id: "analytics-reports",
    to: "/performance/analytics",
    icon: BarChart2,
    label: "Analytics & Reports",
    roles: ["manager", "admin", "administrator", "director", "viewer"],
  },
  {
    id: "finance-profitability",
    to: "/performance/finance",
    icon: Coins,
    label: "Finance & Profitability",
    roles: ["director", "viewer", "manager", "commission_admin"],
  },
  {
    id: "administration",
    to: "/performance/configuration",
    icon: SettingsIcon,
    label: "Administration",
    roles: ["manager", "administrator", "director", "viewer"],
  },
];

export const PERFORMANCE_WORKSPACE_SUB_LINKS: Record<PerformanceWorkspaceId, WorkspaceSubLink[]> = {
  dashboard: [
    { to: "/performance", label: "My performance", icon: LayoutGrid, end: true },
    {
      to: "/performance/executive",
      label: "Executive overview",
      icon: BarChart2,
      roles: ["admin", "administrator", "director", "viewer"],
    },
    { to: "/performance/finance", label: "Finance overview", icon: Banknote, adminOnly: true },
    { to: "/performance/admin", label: "Command center", icon: Calculator, adminOnly: true },
    { to: "/performance/how-it-works", label: "How it works", icon: BookOpen },
  ],
  "discounts-wallets": [
    { to: "/performance/wallets", label: "My wallets", icon: Wallet, end: true },
    { to: "/performance/give-discount", label: "Give discount", icon: Gift },
    {
      to: "/performance/client-commercials",
      label: "Client commercials",
      icon: Link2,
      roles: ["admin", "administrator", "director", "viewer", "manager", "counselor"],
    },
    {
      to: "/performance/wallet/branch-pool",
      label: "Branch pool",
      icon: Gift,
      roles: ["manager", "admin", "administrator"],
      hideFromCounselor: true,
    },
    { to: "/performance/combinations", label: "Service combinations", icon: Combine, hideFromCounselor: true },
    { to: "/performance/wallet/policy", label: "Wallet policy", icon: Settings2, adminOnly: true },
    { to: "/incentives/wallet-topups", label: "Wallet top-ups", icon: Wallet, adminOnly: true },
    { to: "/incentives/period-close", label: "Period close", icon: CalendarClock, adminOnly: true },
  ],
  "offers-promotions": [
    { to: "/performance/offers/requests", label: "Promotion requests", icon: Megaphone, end: true },
    {
      to: "/performance/offers",
      label: "Offers studio",
      icon: LayoutGrid,
      hideFromCounselor: true,
    },
  ],
  "incentives-payouts": [
    { to: "/performance/incentives/payouts", label: "Ledger & liability", icon: Banknote, end: true },
    { to: "/performance/incentives/plans", label: "Incentive plans", icon: Layers, adminOnly: true },
    {
      to: "/performance/approvals",
      label: "Approvals",
      icon: ClipboardCheck,
      roles: ["manager", "admin", "administrator", "director"],
    },
    { to: "/incentives/payouts", label: "Payout desk", icon: Banknote, adminOnly: true },
    { to: "/incentives/admin", label: "Runs", icon: Calculator, adminOnly: true },
    { to: "/incentives/plans", label: "Plans & rules", icon: Settings2, adminOnly: true },
    { to: "/incentives/competitions", label: "Competitions", icon: Trophy, adminOnly: true },
    { to: "/incentives/simulator", label: "Simulator", icon: FlaskConical, adminOnly: true },
  ],
  "teams-performance": [
    { to: "/performance/team", label: "Team & branch", icon: Users, end: true },
    {
      to: "/performance/compare",
      label: "Comparison",
      icon: GitMerge,
      roles: ["admin", "administrator", "director", "viewer", "manager"],
    },
    {
      to: "/performance/admin/unclassified",
      label: "Unclassified payments",
      icon: ScanLine,
      roles: ["manager", "admin", "administrator"],
    },
  ],
  "analytics-reports": [
    { to: "/performance/analytics", label: "Revenue analytics", icon: BarChart2, end: true },
    {
      to: "/performance/reports",
      label: "Report builder",
      icon: FileText,
      roles: ["admin", "administrator", "director", "viewer", "manager"],
    },
  ],
  "finance-profitability": [
    { to: "/performance/finance", label: "Finance dashboard", icon: Banknote, end: true, adminOnly: true },
    {
      to: "/performance/profitability",
      label: "Profitability",
      icon: Coins,
      roles: ["admin", "administrator", "director", "viewer", "manager"],
    },
    {
      to: "/performance/commissions",
      label: "Commissions",
      icon: Receipt,
      roles: ["admin", "administrator", "director", "viewer", "manager"],
    },
    {
      to: "/performance/multi-currency",
      label: "Multi-currency",
      icon: DollarSign,
      roles: ["admin", "administrator", "director", "viewer", "manager"],
    },
    { to: "/masters?section=__currencies", label: "Currency Master", icon: DollarSign, adminOnly: true },
    { to: "/incentives/fx-rates", label: "Performance FX overrides", icon: DollarSign, adminOnly: true },
  ],
  administration: [
    { to: "/performance/configuration", label: "Configuration", icon: SettingsIcon, end: true, adminOnly: true },
    {
      to: "/performance/roles",
      label: "Roles & permissions",
      icon: UserCog,
      roles: ["admin", "administrator", "director", "viewer", "manager"],
    },
    {
      to: "/performance/audit-trail",
      label: "Audit trail",
      icon: Shield,
      roles: ["admin", "administrator", "director", "viewer", "manager"],
    },
    {
      to: "/performance/crm-integration",
      label: "CRM integration",
      icon: Plug,
      roles: ["admin", "administrator", "director", "viewer", "manager"],
    },
    {
      to: "/performance/architecture",
      label: "Architecture & API",
      icon: Database,
      roles: ["admin", "administrator", "director", "viewer", "manager"],
    },
    {
      to: "/performance/admin/approvals",
      label: "Legacy approvals desk",
      icon: ClipboardCheck,
      adminOnly: true,
    },
  ],
};

export function visibleWorkspaceSubLinks(
  workspaceId: PerformanceWorkspaceId,
  ctx: WorkspaceNavContext,
): WorkspaceSubLink[] {
  return PERFORMANCE_WORKSPACE_SUB_LINKS[workspaceId].filter((link) => isWorkspaceSubLinkVisible(link, ctx));
}

export function visiblePerformanceWorkspaceSidebar(ctx: WorkspaceNavContext): WorkspaceSidebarItem[] {
  return PERFORMANCE_WORKSPACE_SIDEBAR.filter((item) => isWorkspaceSidebarVisible(item, ctx));
}

/** Default landing route for counselors on Offers workspace */
export function offersWorkspaceDefaultRoute(ctx: WorkspaceNavContext): string {
  const isCounselorOnly =
    ctx.hasRole(["counselor"]) &&
    !ctx.isAdmin &&
    !ctx.hasRole(["manager", "administrator", "director", "viewer"]);
  return isCounselorOnly ? "/performance/offers/requests" : "/performance/offers";
}

const OFFERS_STUDIO_PATH_PREFIXES = [
  "/performance/offers/library",
  "/performance/offers/codes",
  "/performance/offers/eligibility",
  "/performance/offers/new",
  "/performance/offers/analytics",
  "/performance/offers/calendar",
  "/performance/offers/segments",
  "/performance/offers/automation",
  "/performance/offers/journeys",
  "/performance/offers/ab-tests",
  "/performance/offers/ai-studio",
] as const;

/** Offers studio pages render their own tab bar — skip duplicate workspace nav there. */
export function usesOffersStudioNav(pathname: string): boolean {
  if (pathname === "/performance/offers/requests") return false;
  if (pathname === "/performance/offers") return true;
  return OFFERS_STUDIO_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const WORKSPACE_LOOKUP_ORDER: PerformanceWorkspaceId[] = [
  "teams-performance",
  "administration",
  "finance-profitability",
  "incentives-payouts",
  "discounts-wallets",
  "offers-promotions",
  "analytics-reports",
  "dashboard",
];

/** Resolve pathname to workspace for in-page sub-nav (most specific first). */
export function pathnameToWorkspace(pathname: string): PerformanceWorkspaceId | null {
  for (const id of WORKSPACE_LOOKUP_ORDER) {
    if (isPathInWorkspace(pathname, id)) return id;
  }
  return null;
}
