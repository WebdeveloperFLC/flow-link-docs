import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutGrid, Library, Plus, Megaphone, BarChart2 } from "lucide-react";

const LINKS = [
  { to: "/performance/offers", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/performance/offers/library", label: "Library", icon: Library },
  { to: "/performance/offers/new", label: "Create", icon: Plus },
  { to: "/performance/offers/requests", label: "Requests", icon: Megaphone },
  { to: "/performance/offers/analytics", label: "Analytics", icon: BarChart2 },
];

export function OffersStudioNav() {
  const { pathname } = useLocation();
  return (
    <nav className="flex flex-wrap gap-1 border-b pb-3 mb-4">
      {LINKS.map(({ to, label, icon: Icon, end }) => {
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
