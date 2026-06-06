import { Link } from "react-router-dom";
import flcLogo from "@/assets/flc-logo.png";
import {
  Plane,
  GraduationCap,
  Briefcase,
  BookOpen,
  Trophy,
  BarChart3,
  Calculator,
  Download,
  ChevronLeft,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ACADEMY_CATEGORY_TABS,
  type AcademyCategoryFilter,
  type AcademyNavGroup,
  type AcademyServiceItem,
} from "@/lib/service-library/academyNav";
import { ALLOWED_SERVICE_LIBRARY_COUNTRIES } from "@/lib/serviceLibrary";

const iconMap: Record<AcademyCategoryFilter, typeof Plane> = {
  visa: Plane,
  coaching: GraduationCap,
  allied_travel: Briefcase,
};

type Props = {
  group: AcademyNavGroup | null;
  categoryFilter: AcademyCategoryFilter;
  onCategoryChange: (c: AcademyCategoryFilter) => void;
  activeCount: number;
  reviewCount: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  country: string;
  onCountry: (c: string) => void;
  statusFilter: "all" | "active" | "review";
  onStatusFilter: (f: "all" | "active" | "review") => void;
  search: string;
  onSearch: (q: string) => void;
  userName?: string;
  userRole?: string;
  userInitials?: string;
};

function NavItemButton({
  item,
  selectedId,
  onSelect,
}: {
  item: AcademyServiceItem;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={cn(
        "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left transition-colors",
        selectedId === item.id
          ? "bg-primary text-primary-foreground font-medium"
          : "text-slate-300 hover:bg-slate-800",
      )}
    >
      <span className="flex-1 truncate">{item.label}</span>
      {item.needsReview && (
        <span className="size-1.5 rounded-full bg-amber-400 shrink-0" />
      )}
    </button>
  );
}

function groupItemCount(group: AcademyNavGroup | null): number {
  if (!group) return 0;
  if (group.items) return group.items.length;
  if (group.countryPickers) return group.countryPickers.reduce((n, c) => n + c.count, 0);
  return 0;
}

export function ServiceAcademySidebar({
  group,
  categoryFilter,
  onCategoryChange,
  activeCount,
  reviewCount,
  selectedId,
  onSelect,
  country,
  onCountry,
  statusFilter,
  onStatusFilter,
  search,
  onSearch,
  userName = "Counselor",
  userRole = "Staff",
  userInitials = "FL",
}: Props) {
  const initials =
    userInitials ||
    userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const Icon = iconMap[categoryFilter] ?? BookOpen;
  const count = groupItemCount(group);

  return (
    <aside className="w-[260px] shrink-0 flex flex-col bg-slate-900 text-slate-100 min-h-screen">
      <div className="p-4 border-b border-slate-700/80">
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-xs mb-3">
          <ChevronLeft className="size-3.5" />
          Back to CRM
        </Link>
        <div className="flex items-center gap-2">
          <img
            src={flcLogo}
            alt="Future Link Consultants"
            className="h-9 w-auto object-contain shrink-0 rounded bg-white/95 px-1"
          />
          <div className="leading-tight min-w-0">
            <div className="font-bold text-sm tracking-tight text-white">Future Link Consultants</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
              Service Library
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2 border-b border-slate-700/80">
        <div className="flex flex-col gap-1">
          {ACADEMY_CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onCategoryChange(tab.key)}
              className={cn(
                "w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors",
                categoryFilter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {categoryFilter === "visa" && (
          <Select value={country} onValueChange={onCountry}>
            <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-100 text-xs">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All countries</SelectItem>
              {ALLOWED_SERVICE_LIBRARY_COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Quick find…"
            className="h-8 pl-8 text-xs bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500"
          />
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onStatusFilter(statusFilter === "active" ? "all" : "active")}
            className={cn(
              "flex-1 rounded-lg border px-2 py-1.5 text-[10px] font-medium",
              statusFilter === "active"
                ? "border-primary bg-primary/20 text-primary-foreground"
                : "border-slate-600 text-slate-400",
            )}
          >
            {activeCount} Active
          </button>
          <button
            type="button"
            onClick={() => onStatusFilter(statusFilter === "review" ? "all" : "review")}
            className={cn(
              "flex-1 rounded-lg border px-2 py-1.5 text-[10px] font-medium",
              statusFilter === "review"
                ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
                : "border-slate-600 text-slate-400",
            )}
          >
            {reviewCount} Review
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {group ? (
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-2 mb-2">
              <Icon className="size-3" />
              {group.label}
              <span className="ml-auto tabular-nums">{count}</span>
            </div>

            {categoryFilter === "visa" && country !== "ALL" && (
              <button
                type="button"
                onClick={() => onCountry("ALL")}
                className="mb-2 w-full text-left px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200"
              >
                ← All countries
              </button>
            )}

            {group.items && (
              <ul className="space-y-0.5">
                {categoryFilter === "visa" && country !== "ALL" && (
                  <li className="px-2 pb-1 text-[10px] text-slate-500">Step 2 — Select a visa service</li>
                )}
                {group.items.map((item) => (
                  <li key={item.id}>
                    <NavItemButton item={item} selectedId={selectedId} onSelect={onSelect} />
                  </li>
                ))}
              </ul>
            )}

            {group.countryPickers && (
              <div className="space-y-1">
                <p className="px-2 pb-1 text-[10px] text-slate-500 leading-snug">
                  Step 1 — Select a country
                </p>
                <ul className="space-y-0.5">
                  {group.countryPickers.map((picker) => (
                    <li key={picker.country}>
                      <button
                        type="button"
                        onClick={() => onCountry(picker.country)}
                        className={cn(
                          "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left transition-colors",
                          country === picker.country
                            ? "bg-primary text-primary-foreground font-medium"
                            : "text-slate-300 hover:bg-slate-800",
                        )}
                      >
                        <span className="flex-1 truncate">{picker.country}</span>
                        <span className="text-[10px] opacity-80">{picker.countryBadge}</span>
                        <span className="text-[10px] tabular-nums opacity-80">{picker.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {categoryFilter === "visa" && country !== "ALL" && group.items && group.items.length === 0 && (
              <p className="px-2 text-xs text-slate-500">No visa services for this country.</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 px-2">No services match filters.</p>
        )}
      </nav>

      <div className="p-3 border-t border-slate-700/80">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="size-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{userName}</div>
            <div className="text-[11px] text-slate-400 truncate">{userRole}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
