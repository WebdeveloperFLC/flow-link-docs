import {
  LayoutDashboard,
  UserCircle,
  FolderOpen,
  Receipt,
  MessageSquare,
  FileText,
  Users,
} from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const CLIENT_DETAIL_TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "profile", label: "Profile", icon: UserCircle },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "commercial", label: "Billing", icon: Receipt },
  { id: "communications", label: "Comms", icon: MessageSquare },
  { id: "forms", label: "Forms & Letters", icon: FileText },
  { id: "team", label: "Team & Access", icon: Users },
] as const;

export type ClientDetailTabId = (typeof CLIENT_DETAIL_TABS)[number]["id"];

export function isClientDetailTabId(value: string | null): value is ClientDetailTabId {
  return CLIENT_DETAIL_TABS.some((t) => t.id === value);
}

type Props = {
  badges?: Partial<Record<ClientDetailTabId, string | number>>;
};

/** Sticky tab bar — must be rendered inside `<Tabs>`. */
export function ClientDetailTabNav({ badges }: Props) {
  return (
    <div className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 shadow-elev-sm">
      <div className="gradient-brand px-4 sm:px-8 py-2.5">
        <p className="text-[11px] font-semibold text-primary-foreground/90 uppercase tracking-wider">
          Client workspace
        </p>
      </div>
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent px-4 sm:px-8 py-2 rounded-none scrollbar-none">
        {CLIENT_DETAIL_TABS.map((tab) => {
          const Icon = tab.icon;
          const badge = badges?.[tab.id];
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "shrink-0 gap-1.5 rounded-lg px-3 py-2 text-sm font-medium",
                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm",
                "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/60",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
              {badge != null && Number(badge) > 0 && (
                <span className="ml-0.5 rounded-full bg-secondary px-1.5 py-0 text-[10px] font-bold text-secondary-foreground">
                  {badge}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </div>
  );
}
