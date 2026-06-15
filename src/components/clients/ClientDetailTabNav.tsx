import {
  LayoutDashboard,
  UserCircle,
  FolderOpen,
  Receipt,
  MessageSquare,
  FileText,
  Users,
  ClipboardCheck,
  GitBranch,
  GraduationCap,
  ListTodo,
  UsersRound,
  Briefcase,
} from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const CLIENT_DETAIL_TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "qualification", label: "Qualification", icon: ClipboardCheck },
  { id: "profile", label: "Profile", icon: UserCircle },
  { id: "family", label: "Family", icon: UsersRound },
  { id: "services", label: "Client service", icon: Briefcase },
  { id: "setup", label: "Stage & Setup", icon: GitBranch },
  { id: "programs", label: "Programs", icon: GraduationCap },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "forms", label: "Forms & Letters", icon: FileText },
  { id: "commercial", label: "Payments", icon: Receipt },
  { id: "communications", label: "Comms", icon: MessageSquare },
  { id: "tasks", label: "Tasks", icon: ListTodo },
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
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent px-4 sm:px-8 py-2 rounded-none scrollbar-none">
        {CLIENT_DETAIL_TABS.map((tab) => {
          const Icon = tab.icon;
          const badge = badges?.[tab.id];
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "shrink-0 gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium border border-transparent",
                "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/30 data-[state=active]:shadow-none",
                "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/60 data-[state=inactive]:border-border/60",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="hidden lg:inline">{tab.label}</span>
              <span className="lg:hidden">{tab.label.split(" ")[0]}</span>
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
