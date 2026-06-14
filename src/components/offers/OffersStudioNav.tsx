import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutGrid, Library, Plus, Megaphone, BarChart2, Sparkles, CalendarDays, Users, Zap, GitBranch, FlaskConical, Ticket, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermission } from "@/hooks/useModulePermission";

const BASE_LINKS = [
  { to: "/performance/offers", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/performance/offers/library", label: "Library", icon: Library },
  { to: "/performance/offers/codes", label: "Codes", icon: Ticket },
  { to: "/performance/offers/eligibility", label: "Eligibility", icon: ShieldCheck },
  { to: "/performance/offers/new", label: "Create", icon: Plus },
  { to: "/performance/offers/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/performance/offers/segments", label: "Segments", icon: Users },
  { to: "/performance/offers/automation", label: "Automation", icon: Zap },
  { to: "/performance/offers/journeys", label: "Journeys", icon: GitBranch },
  { to: "/performance/offers/requests", label: "Requests", icon: Megaphone },
  { to: "/performance/offers/analytics", label: "Analytics", icon: BarChart2 },
  { to: "/performance/offers/ab-tests", label: "A/B tests", icon: FlaskConical },
];

export function OffersStudioNav() {
  const { pathname } = useLocation();
  const { hasRole } = useAuth();
  const { canEdit: canAi } = useModulePermission("offers_ai");
  const showAi = canAi || hasRole(["admin", "administrator"]);
  const links = showAi
    ? [...BASE_LINKS, { to: "/performance/offers/ai-studio", label: "AI Studio", icon: Sparkles, end: false }]
    : BASE_LINKS;
  return (
    <nav className="flex flex-wrap gap-1 border-b pb-3 mb-4">
      {links.map(({ to, label, icon: Icon, end }) => {
        const active = end ? pathname === to : pathname.startsWith(to);
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
