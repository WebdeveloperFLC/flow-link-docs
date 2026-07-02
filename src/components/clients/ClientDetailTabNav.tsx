import {
  LayoutDashboard,
  UserCircle,
  Layers,
  FolderOpen,
  Receipt,
  MessageSquare,
  ListTodo,
  Users,
  ScrollText,
  GraduationCap,
  FileText,
  Briefcase,
} from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Leaf tabs — URL ?tab= values (legacy redirects still supported). */
export const CLIENT_DETAIL_TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "overview" },
  { id: "profile", label: "Profile", icon: UserCircle, group: "case" },
  { id: "client-services", label: "Services", icon: Layers, group: "case" },
  { id: "applications", label: "Applications", icon: GraduationCap, group: "case" },
  { id: "documents", label: "Documents", icon: FolderOpen, group: "documents" },
  { id: "forms", label: "Forms & Letters", icon: FileText, group: "documents" },
  { id: "commercial", label: "Payments", icon: Receipt, group: "commercial" },
  { id: "communications", label: "Comms", icon: MessageSquare, group: "work" },
  { id: "tasks", label: "Tasks", icon: ListTodo, group: "work" },
  { id: "team", label: "Team & Access", icon: Users, group: "work" },
  { id: "activity-log", label: "Activity Log", icon: ScrollText, group: "work" },
] as const;

export const CLIENT_DETAIL_GROUPS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "case", label: "Case", icon: Briefcase },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "commercial", label: "Money", icon: Receipt },
  { id: "work", label: "Activity", icon: MessageSquare },
] as const;

/** @deprecated Removed tabs — kept for URL redirects. */
export const LEGACY_CLIENT_DETAIL_TABS = [
  "family",
  "services",
  "setup",
  "programs",
] as const;

export type ClientDetailTabId = (typeof CLIENT_DETAIL_TABS)[number]["id"];
export type ClientDetailGroupId = (typeof CLIENT_DETAIL_GROUPS)[number]["id"];

export function isClientDetailTabId(value: string | null): value is ClientDetailTabId {
  return CLIENT_DETAIL_TABS.some((t) => t.id === value);
}

export function tabBelongsToGroup(tab: ClientDetailTabId, group: ClientDetailGroupId): boolean {
  return CLIENT_DETAIL_TABS.find((t) => t.id === tab)?.group === group;
}

export function resolveClientDetailGroup(tab: ClientDetailTabId): ClientDetailGroupId {
  return CLIENT_DETAIL_TABS.find((t) => t.id === tab)?.group ?? "overview";
}

export function defaultTabForGroup(group: ClientDetailGroupId): ClientDetailTabId {
  const first = CLIENT_DETAIL_TABS.find((t) => t.group === group);
  return first?.id ?? "overview";
}

/** Map old tab URLs to current tabs (e.g. ?tab=family → profile). */
export function resolveClientDetailTab(value: string | null): ClientDetailTabId {
  if (!value) return "overview";
  if (value === "setup" || value === "staging") return "overview";
  if (value === "family") return "team";
  if (value === "services" || value === "programs") return "client-services";
  if (value === "qualification") return "applications";
  if (isClientDetailTabId(value)) return value;
  return "overview";
}

export function shouldOpenAssessmentFromTab(_value: string | null): boolean {
  return false;
}

const LEGACY_TAB_LABELS: Record<string, string> = {
  family: "Family",
  services: "Services",
  setup: "Setup",
  programs: "Programs",
  staging: "Staging",
  qualification: "Qualification",
};

const RESOLVED_TAB_LABELS: Record<ClientDetailTabId, string> = {
  overview: "Overview",
  profile: "Profile",
  "client-services": "Client Services",
  applications: "Applications",
  documents: "Documents",
  forms: "Forms & Letters",
  commercial: "Payments",
  communications: "Comms",
  tasks: "Tasks",
  team: "Team & Access",
  "activity-log": "Activity Log",
};

/** Human-readable one-time redirect notice for legacy ?tab= URLs. */
export function legacyClientTabRedirectMessage(
  legacyTab: string,
  resolvedTab: ClientDetailTabId,
): string | null {
  if (legacyTab === resolvedTab) return null;
  const from = LEGACY_TAB_LABELS[legacyTab] ?? legacyTab;
  const to = RESOLVED_TAB_LABELS[resolvedTab] ?? resolvedTab;
  return `'${from}' is now under '${to}'.`;
}

type Props = {
  activeTab: ClientDetailTabId;
  onTabChange: (tab: ClientDetailTabId) => void;
  badges?: Partial<Record<ClientDetailTabId, string | number>>;
};

/** Sticky grouped tab bar — must be rendered inside `<Tabs>`. */
export function ClientDetailTabNav({ activeTab, onTabChange, badges }: Props) {
  const activeGroup = resolveClientDetailGroup(activeTab);
  const secondaryTabs = CLIENT_DETAIL_TABS.filter((t) => t.group === activeGroup);

  const groupBadge = (groupId: ClientDetailGroupId) => {
    const tabs = CLIENT_DETAIL_TABS.filter((t) => t.group === groupId);
    let sum = 0;
    for (const t of tabs) {
      const n = badges?.[t.id];
      if (n != null) sum += Number(n);
    }
    return sum > 0 ? sum : null;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 shadow-elev-sm space-y-0">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent px-4 sm:px-8 py-2 rounded-none scrollbar-none border-b border-border/60">
          {CLIENT_DETAIL_GROUPS.map((group) => {
            const Icon = group.icon;
            const isActive = activeGroup === group.id;
            const badge = groupBadge(group.id);
            const trigger = (
              <TabsTrigger
                key={group.id}
                value={group.id}
                data-state={isActive ? "active" : "inactive"}
                className={cn(
                  "shrink-0 gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium border border-transparent",
                  isActive
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "text-muted-foreground hover:bg-muted/60 border-border/60",
                )}
                onClick={() => {
                  if (!isActive) onTabChange(defaultTabForGroup(group.id));
                }}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">{group.label}</span>
                {badge != null && (
                  <span className="ml-0.5 rounded-full bg-secondary px-1.5 py-0 text-[10px] font-bold text-secondary-foreground">
                    {badge}
                  </span>
                )}
              </TabsTrigger>
            );
            return (
              <Tooltip key={group.id}>
                <TooltipTrigger asChild>{trigger}</TooltipTrigger>
                <TooltipContent side="bottom" className="sm:hidden">{group.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </TabsList>

        {secondaryTabs.length > 1 && (
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent px-4 sm:px-8 py-2 rounded-none scrollbar-none">
            {secondaryTabs.map((tab) => {
              const Icon = tab.icon;
              const badge = badges?.[tab.id];
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  data-state={activeTab === tab.id ? "active" : "inactive"}
                  className={cn(
                    "shrink-0 gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border border-transparent",
                    activeTab === tab.id
                      ? "bg-muted text-foreground border-border"
                      : "text-muted-foreground hover:bg-muted/50",
                  )}
                  onClick={() => onTabChange(tab.id)}
                >
                  <Icon className="size-3 shrink-0" />
                  {tab.label}
                  {badge != null && Number(badge) > 0 && (
                    <span className="ml-0.5 rounded-full bg-secondary px-1.5 py-0 text-[10px] font-bold text-secondary-foreground">
                      {badge}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        )}
      </div>
    </TooltipProvider>
  );
}
