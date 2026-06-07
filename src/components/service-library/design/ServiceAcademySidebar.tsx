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
import type { CoachingVariant, VisaImmigrationBucket } from "@/lib/service-library/serviceNavClassification";

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
  visaBucket: VisaImmigrationBucket | null;
  onVisaBucket: (b: VisaImmigrationBucket | null) => void;
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
      {item.needsReview && <span className="size-1.5 rounded-full bg-amber-400 shrink-0" />}
    </button>
  );
}

function StepHint({ children }: { children: React.ReactNode }) {
  return <p className="px-2 pb-1 text-[10px] text-slate-500 leading-snug sr-only">{children}</p>;
}

export function ServiceAcademySidebar({
  group,
  categoryFilter,
  onCategoryChange,
  country,
  onCountry,
  visaBucket,
  onVisaBucket,
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
    onVisaBucket(null);
    onCoachingFamily(null);
    onCoachingVariant(null);
  };

  const resetToVisaBuckets = () => {
    onVisaBucket(null);
  };

  const resetToCoachingFamilies = () => {
    onCoachingFamily(null);
    onCoachingVariant(null);
  };

  const resetToCoachingVariants = () => {
    onCoachingVariant(null);
  };

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
        {country !== "ALL" && categoryFilter === "visa" && (
          <button
            type="button"
            onClick={resetToCountries}
            className="w-full text-left px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200"
          >
            ← All countries
          </button>
        )}

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

        {categoryFilter === "visa" && country !== "ALL" && (
          <div className="rounded-md bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-300">
            {country}
            {visaBucket ? ` · ${visaBucket === "visa" ? "Visa" : "Immigration"}` : ""}
          </div>
        )}

        {categoryFilter === "coaching" && coachingFamily && (
          <div className="rounded-md bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-300">
            {coachingFamily}
            {coachingVariant ? ` · ${coachingVariant === "general" ? "General" : coachingVariant === "academic" ? "Academic" : "All"}` : ""}
          </div>
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

            {step === "countries" && group.countryPickers && (
              <div className="space-y-1">
                <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">Countries</p>
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

            {step === "visa_buckets" && group.subBuckets && (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={resetToCountries}
                  className="mb-1 w-full text-left px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200"
                >
                  ← {country}
                </button>
                <StepHint>Visa or Immigration pathway</StepHint>
                <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">Pathway</p>
                <ul className="space-y-0.5">
                  {group.subBuckets.map((bucket) => (
                    <li key={bucket.key}>
                      <button
                        type="button"
                        onClick={() => onVisaBucket(bucket.key)}
                        className={cn(
                          "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left transition-colors",
                          visaBucket === bucket.key
                            ? "bg-primary text-primary-foreground font-medium"
                            : "text-slate-300 hover:bg-slate-800",
                        )}
                      >
                        <span className="flex-1 truncate">{bucket.label}</span>
                        <span className="text-[10px] tabular-nums opacity-80">{bucket.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step === "coaching_families" && group.coachingFamilies && (
              <div className="space-y-1">
                <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">Programs</p>
                <ul className="space-y-0.5">
                  {group.coachingFamilies.map((family) => (
                    <li key={family.key}>
                      <button
                        type="button"
                        onClick={() => onCoachingFamily(family.key)}
                        className={cn(
                          "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left transition-colors",
                          coachingFamily === family.key
                            ? "bg-primary text-primary-foreground font-medium"
                            : "text-slate-300 hover:bg-slate-800",
                        )}
                      >
                        <span className="flex-1 truncate">{family.label}</span>
                        <span className="text-[10px] tabular-nums opacity-80">{family.count}</span>
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
                  className="mb-1 w-full text-left px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200"
                >
                  ← {coachingFamily}
                </button>
                <StepHint>General or Academic</StepHint>
                <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">Format</p>
                <ul className="space-y-0.5">
                  {group.coachingVariants.map((variant) => (
                    <li key={variant.key}>
                      <button
                        type="button"
                        onClick={() => onCoachingVariant(variant.key)}
                        className={cn(
                          "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left transition-colors",
                          coachingVariant === variant.key
                            ? "bg-primary text-primary-foreground font-medium"
                            : "text-slate-300 hover:bg-slate-800",
                        )}
                      >
                        <span className="flex-1 truncate">{variant.label}</span>
                        <span className="text-[10px] tabular-nums opacity-80">{variant.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step === "services" && group.items && (
              <ul className="space-y-0.5">
                {categoryFilter === "visa" && (
                  <button
                    type="button"
                    onClick={resetToVisaBuckets}
                    className="mb-1 w-full text-left px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    ← {visaBucket === "visa" ? "Visa" : "Immigration"}
                  </button>
                )}
                {categoryFilter === "coaching" && coachingVariant && (
                  <button
                    type="button"
                    onClick={resetToCoachingVariants}
                    className="mb-1 w-full text-left px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    ← {coachingVariant === "general" ? "General" : coachingVariant === "academic" ? "Academic" : "Formats"}
                  </button>
                )}
                <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">Services</p>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <NavItemButton item={item} selectedId={selectedId} onSelect={onSelect} />
                  </li>
                ))}
              </ul>
            )}

            {step === "services" && group.items?.length === 0 && (
              <p className="px-2 text-xs text-slate-500">No services in this section yet.</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 px-2">
            {categoryFilter === "coaching"
              ? "No coaching academy content yet. Content will appear here once seeded."
              : "No services match filters."}
          </p>
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
