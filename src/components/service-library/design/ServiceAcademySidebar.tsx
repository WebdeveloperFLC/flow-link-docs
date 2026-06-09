import { Link } from "react-router-dom";
import flcLogo from "@/assets/flc-logo.png";
import { Plane, GraduationCap, BookOpen, ChevronLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ACADEMY_CATEGORY_TABS,
  groupItemCount,
  type AcademyCategoryFilter,
  type AcademyNavGroup,
  type AcademyServiceItem,
} from "@/lib/service-library/academyNav";
import type { CoachingVariant } from "@/lib/service-library/serviceNavClassification";

const iconMap: Record<AcademyCategoryFilter, typeof Plane> = {
  visa: Plane,
  coaching: GraduationCap,
};

type Props = {
  group: AcademyNavGroup | null;
  categoryFilter: AcademyCategoryFilter;
  onCategoryChange: (c: AcademyCategoryFilter) => void;
  country: string;
  onCountry: (c: string) => void;
  coachingFamily: string | null;
  onCoachingFamily: (f: string | null) => void;
  coachingVariant: CoachingVariant | null;
  onCoachingVariant: (v: CoachingVariant | null) => void;
  activeCount: number;
  reviewCount: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  statusFilter: "all" | "active" | "review";
  onStatusFilter: (f: "all" | "active" | "review") => void;
  search: string;
  onSearch: (q: string) => void;
  userName?: string;
  userRole?: string;
  userInitials?: string;
};

const navBtnBase =
  "w-full flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm text-left transition-all";
const navBtnIdle = "text-slate-100 hover:bg-slate-800/90 hover:text-white";
const navBtnActive = "bg-gradient-to-r from-sky-500 to-violet-600 text-white font-semibold shadow-md shadow-violet-900/30";

function NavItemButton({
  item,
  selectedId,
  onSelect,
}: {
  item: AcademyServiceItem;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const selected = selectedId === item.id;
  return (
    <button
      type="button"
      title={item.label}
      onClick={() => onSelect(item.id)}
      className={cn(navBtnBase, selected ? navBtnActive : navBtnIdle)}
    >
      <span className="flex-1 min-w-0 leading-snug line-clamp-2 break-words">{item.label}</span>
      {item.needsReview && (
        <span className="size-2 rounded-full bg-amber-400 shrink-0 ring-2 ring-slate-900" title="Needs review" />
      )}
    </button>
  );
}

function SectionLabel({ children, accent = "sky" }: { children: React.ReactNode; accent?: "sky" | "violet" | "emerald" }) {
  const colors = {
    sky: "text-sky-400",
    violet: "text-violet-400",
    emerald: "text-emerald-400",
  };
  return (
    <p className={cn("px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider", colors[accent])}>
      {children}
    </p>
  );
}

export function ServiceAcademySidebar({
  group,
  categoryFilter,
  onCategoryChange,
  country,
  onCountry,
  coachingFamily,
  onCoachingFamily,
  coachingVariant,
  onCoachingVariant,
  activeCount,
  reviewCount,
  selectedId,
  onSelect,
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
  const step = group?.step;

  const resetToCountries = () => {
    onCountry("ALL");
    onCoachingFamily(null);
    onCoachingVariant(null);
  };

  const resetToCoachingFamilies = () => {
    onCoachingFamily(null);
    onCoachingVariant(null);
  };

  const resetToCoachingVariants = () => {
    onCoachingVariant(null);
  };

  return (
    <aside className="w-[300px] shrink-0 flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 min-h-screen border-r border-slate-800">
      <div className="p-3 border-b border-slate-700/80">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sky-400/90 hover:text-sky-300 text-xs font-medium mb-3 transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          Back to CRM
        </Link>
        <div className="rounded-xl overflow-hidden bg-black border border-slate-700/80 shadow-lg">
          <img
            src={flcLogo}
            alt="Future Link Consultants"
            className="w-full h-[4.5rem] object-contain object-center p-2"
          />
        </div>
        <p className="mt-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] bg-gradient-to-r from-sky-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          Service Library
        </p>
      </div>

      <div className="p-3 space-y-2.5 border-b border-slate-700/80">
        <div className="flex flex-col gap-1.5">
          {ACADEMY_CATEGORY_TABS.map((tab) => {
            const active = categoryFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onCategoryChange(tab.key)}
                className={cn(
                  "w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-all",
                  active
                    ? tab.key === "visa"
                      ? "bg-gradient-to-r from-sky-500 to-violet-600 text-white shadow-md shadow-violet-900/25"
                      : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-900/25"
                    : "bg-slate-800/80 text-slate-200 hover:bg-slate-800 hover:text-white border border-slate-700/50",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {categoryFilter === "visa" && country !== "ALL" && (
          <div className="rounded-lg border border-sky-500/35 bg-sky-950/40 px-3 py-2 text-xs font-medium text-sky-100">
            <span className="text-sky-300">{country}</span>
            <span className="text-slate-400 mx-1">·</span>
            <span className="text-violet-300">Visa & Immigration</span>
          </div>
        )}

        {categoryFilter === "coaching" && coachingFamily && (
          <div className="rounded-lg border border-emerald-500/35 bg-emerald-950/40 px-3 py-2 text-xs font-medium text-emerald-100">
            {coachingFamily}
            {coachingVariant
              ? ` · ${coachingVariant === "general" ? "General" : coachingVariant === "academic" ? "Academic" : "All"}`
              : ""}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-sky-400/70" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Quick find…"
            className="h-9 pl-9 text-sm bg-slate-800/90 border-slate-600 text-white placeholder:text-slate-400 focus-visible:ring-sky-500/50"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onStatusFilter(statusFilter === "active" ? "all" : "active")}
            className={cn(
              "flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors",
              statusFilter === "active"
                ? "border-sky-500/60 bg-sky-500/20 text-sky-100"
                : "border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white",
            )}
          >
            {activeCount} Active
          </button>
          <button
            type="button"
            onClick={() => onStatusFilter(statusFilter === "review" ? "all" : "review")}
            className={cn(
              "flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors",
              statusFilter === "review"
                ? "border-amber-500/60 bg-amber-500/20 text-amber-100"
                : "border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white",
            )}
          >
            {reviewCount} Review
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {group ? (
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-2 mb-3">
              <Icon className="size-4 text-violet-400 shrink-0" />
              <span className="bg-gradient-to-r from-sky-300 to-violet-300 bg-clip-text text-transparent">
                {group.label}
              </span>
              <span className="ml-auto tabular-nums text-sky-400 text-sm">{count}</span>
            </div>

            {step === "countries" && group.countryPickers && (
              <div className="space-y-1">
                <SectionLabel accent="sky">Countries</SectionLabel>
                <ul className="space-y-1">
                  {group.countryPickers.map((picker) => (
                    <li key={picker.country}>
                      <button
                        type="button"
                        onClick={() => onCountry(picker.country)}
                        className={cn(
                          navBtnBase,
                          country === picker.country ? navBtnActive : navBtnIdle,
                        )}
                      >
                        <span className="flex-1 truncate font-medium">{picker.country}</span>
                        <span className="text-[11px] font-bold text-sky-300 tabular-nums">{picker.countryBadge}</span>
                        <span className="text-[11px] text-violet-300 tabular-nums">{picker.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step === "coaching_families" && group.coachingFamilies && (
              <div className="space-y-1">
                <SectionLabel accent="emerald">Programs</SectionLabel>
                <ul className="space-y-1">
                  {group.coachingFamilies.map((family) => (
                    <li key={family.key}>
                      <button
                        type="button"
                        onClick={() => onCoachingFamily(family.key)}
                        className={cn(
                          navBtnBase,
                          coachingFamily === family.key
                            ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-md"
                            : navBtnIdle,
                        )}
                      >
                        <span className="flex-1 truncate font-medium">{family.label}</span>
                        <span className="text-[11px] text-emerald-300 tabular-nums">{family.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step === "coaching_variants" && group.coachingVariants && (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={resetToCoachingFamilies}
                  className="mb-1 w-full text-left px-2 py-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  ← {coachingFamily}
                </button>
                <SectionLabel accent="emerald">Format</SectionLabel>
                <ul className="space-y-1">
                  {group.coachingVariants.map((variant) => (
                    <li key={variant.key}>
                      <button
                        type="button"
                        onClick={() => onCoachingVariant(variant.key)}
                        className={cn(
                          navBtnBase,
                          coachingVariant === variant.key
                            ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-md"
                            : navBtnIdle,
                        )}
                      >
                        <span className="flex-1 truncate font-medium">{variant.label}</span>
                        <span className="text-[11px] text-emerald-300 tabular-nums">{variant.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step === "services" && group.items && (
              <ul className="space-y-1">
                {categoryFilter === "visa" && (
                  <button
                    type="button"
                    onClick={resetToCountries}
                    className="mb-2 w-full text-left px-2 py-1 text-xs font-medium text-sky-400 hover:text-sky-300"
                  >
                    ← All countries
                  </button>
                )}
                {categoryFilter === "coaching" && coachingVariant && (
                  <button
                    type="button"
                    onClick={resetToCoachingVariants}
                    className="mb-2 w-full text-left px-2 py-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                  >
                    ← {coachingVariant === "general" ? "General" : coachingVariant === "academic" ? "Academic" : "Formats"}
                  </button>
                )}
                <SectionLabel accent="violet">Services</SectionLabel>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <NavItemButton item={item} selectedId={selectedId} onSelect={onSelect} />
                  </li>
                ))}
              </ul>
            )}

            {step === "services" && group.items?.length === 0 && (
              <p className="px-2 text-sm text-slate-400">No services in this section yet.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400 px-2">
            {categoryFilter === "coaching"
              ? "No coaching academy content yet."
              : "No services match filters."}
          </p>
        )}
      </nav>

      <div className="p-3 border-t border-slate-700/80 bg-slate-950/50">
        <div className="flex items-center gap-3 px-1 py-2">
          <div className="size-10 rounded-full bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{userName}</div>
            <div className="text-xs text-sky-300/90 truncate">{userRole}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
