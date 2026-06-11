import {
  ArrowRight,
  ChevronRight,
  Globe2,
  GraduationCap,
  Stamp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  AcademyCategoryFilter,
  AcademyNavGroup,
  AcademyServiceItem,
} from "@/lib/service-library/academyNav";
import type { CoachingVariant } from "@/lib/service-library/serviceNavClassification";
import { countryFlagEmoji } from "@/lib/service-library/countryBadges";

type Props = {
  group: AcademyNavGroup | null;
  categoryFilter: AcademyCategoryFilter;
  country: string;
  coachingFamily: string | null;
  coachingVariant: CoachingVariant | null;
  onCountry: (c: string) => void;
  onCoachingFamily: (f: string | null) => void;
  onCoachingVariant: (v: CoachingVariant | null) => void;
  onSelectService: (id: string) => void;
};

function Breadcrumb({
  items,
}: {
  items: { label: string; onClick?: () => void }[];
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground mb-6">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3.5 shrink-0 opacity-50" />}
          {item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              className="hover:text-foreground transition-colors font-medium"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function StepPills({ steps, active }: { steps: string[]; active: number }) {
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {steps.map((label, i) => (
        <div
          key={label}
          className={cn(
            "rounded-full px-3 py-1 text-[11px] font-medium border transition-colors",
            i <= active
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-muted/40 border-transparent text-muted-foreground",
          )}
        >
          {i + 1}. {label}
        </div>
      ))}
    </div>
  );
}

function CountryCard({
  country,
  badge,
  flag,
  count,
  onClick,
}: {
  country: string;
  badge: string;
  flag: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left group">
      <Card className="p-4 h-full shadow-elev-sm hover:border-primary/40 hover:shadow-md transition-all group-hover:bg-primary/[0.02]">
        <div className="flex items-start gap-3">
          <div className="size-11 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0 gap-0.5">
            {flag ? (
              <span className="text-2xl leading-none" aria-hidden>
                {flag}
              </span>
            ) : (
              <span className="text-primary font-bold text-sm">{badge}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
              {flag && <span className="text-base leading-none sm:hidden" aria-hidden>{flag}</span>}
              {country}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{count} services</p>
          </div>
          <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
        </div>
      </Card>
    </button>
  );
}

function ServiceCard({
  item,
  countryFlag,
  onClick,
}: {
  item: AcademyServiceItem;
  countryFlag?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left group w-full">
      <Card className="p-4 shadow-elev-sm hover:border-primary/40 hover:shadow-md transition-all group-hover:bg-primary/[0.02]">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0 text-lg leading-none">
            {countryFlag ? (
              <span aria-hidden>{countryFlag}</span>
            ) : (
              <Stamp className="size-4 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm leading-snug group-hover:text-primary transition-colors">
              {item.label}
            </div>
            {item.countryBadge && !countryFlag && (
              <span className="text-[10px] text-muted-foreground">{item.countryBadge}</span>
            )}
          </div>
          {item.needsReview && (
            <Badge variant="outline" className="text-[10px] shrink-0 border-amber-400 text-amber-700">
              Review
            </Badge>
          )}
          <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
      </Card>
    </button>
  );
}

function ChoiceCard({
  title,
  count,
  onClick,
  icon: Icon,
}: {
  title: string;
  count: number;
  onClick: () => void;
  icon: typeof GraduationCap;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left group">
      <Card className="p-5 h-full shadow-elev-sm hover:border-primary/40 hover:shadow-md transition-all">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold group-hover:text-primary transition-colors">{title}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{count} services</p>
          </div>
          <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Card>
    </button>
  );
}

export function ServiceAcademyNavPanel({
  group,
  categoryFilter,
  country,
  coachingFamily,
  coachingVariant,
  onCountry,
  onCoachingFamily,
  onCoachingVariant,
  onSelectService,
}: Props) {
  const step = group?.step;

  if (!group) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground text-sm">
        No services match your filters.
      </div>
    );
  }

  const resetCountry = () => onCountry("ALL");
  const resetFamily = () => onCoachingFamily(null);

  if (categoryFilter === "visa" && step === "countries" && group.countryPickers) {
    return (
      <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 md:py-10 max-w-5xl mx-auto w-full">
        <Breadcrumb items={[{ label: "All countries" }]} />
        <StepPills steps={["Country", "Service"]} active={0} />
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Globe2 className="size-6 text-sky-500" />
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-sky-600 to-violet-600 bg-clip-text text-transparent">
              Choose a destination
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">
            Pick the country your client is applying for, then open counselor training for that visa or
            immigration service.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {group.countryPickers.map((p) => (
            <CountryCard
              key={p.country}
              country={p.country}
              badge={p.countryBadge}
              flag={countryFlagEmoji(p.country)}
              count={p.count}
              onClick={() => onCountry(p.country)}
            />
          ))}
        </div>
      </div>
    );
  }

  if (step === "services" && group.items) {
    const sectionLabel =
      categoryFilter === "visa" ? "Visa & Immigration" : coachingFamily ?? "Coaching";
    const activeCountryFlag = categoryFilter === "visa" ? countryFlagEmoji(country) : "";

    return (
      <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 md:py-10 max-w-4xl mx-auto w-full">
        <Breadcrumb
          items={
            categoryFilter === "visa"
              ? [
                  { label: "All countries", onClick: resetCountry },
                  { label: `${activeCountryFlag ? `${activeCountryFlag} ` : ""}${country} · ${sectionLabel}` },
                ]
              : [{ label: "Coaching", onClick: resetFamily }, { label: sectionLabel }]
          }
        />
        <StepPills
          steps={
            categoryFilter === "visa"
              ? ["Country", "Service"]
              : ["Program", "Format", "Service"]
          }
          active={categoryFilter === "visa" ? 1 : 2}
        />
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight mb-1 bg-gradient-to-r from-sky-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-2">
            {activeCountryFlag && (
              <span className="text-2xl leading-none not-italic" aria-hidden>
                {activeCountryFlag}
              </span>
            )}
            <span>
              {categoryFilter === "visa" ? `${country} · Visa & Immigration` : sectionLabel}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Select a service to open checklists, sample docs, quizzes, and counselor notes.
          </p>
        </div>
        {group.items.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">No services in this section yet.</Card>
        ) : (
          <div className="grid gap-2">
            {group.items.map((item) => (
              <ServiceCard
                key={item.id}
                item={item}
                countryFlag={activeCountryFlag || undefined}
                onClick={() => onSelectService(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (categoryFilter === "coaching" && step === "coaching_families" && group.coachingFamilies) {
    return (
      <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 md:py-10 max-w-4xl mx-auto w-full">
        <Breadcrumb items={[{ label: "Coaching" }]} />
        <StepPills steps={["Program", "Format", "Service"]} active={0} />
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Coaching programs</h1>
          <p className="text-sm text-muted-foreground">IELTS, PTE, GRE, and other test-prep academy content.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {group.coachingFamilies.map((f) => (
            <ChoiceCard
              key={f.key}
              title={f.label}
              count={f.count}
              icon={GraduationCap}
              onClick={() => onCoachingFamily(f.key)}
            />
          ))}
        </div>
      </div>
    );
  }

  if (categoryFilter === "coaching" && step === "coaching_variants" && group.coachingVariants) {
    return (
      <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 md:py-10 max-w-3xl mx-auto w-full">
        <Breadcrumb
          items={[
            { label: "Coaching", onClick: resetFamily },
            { label: coachingFamily ?? "Program" },
          ]}
        />
        <StepPills steps={["Program", "Format", "Service"]} active={1} />
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2">{coachingFamily} — pick format</h1>
          <p className="text-sm text-muted-foreground">General vs Academic tracks for IELTS and similar tests.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {group.coachingVariants.map((v) => (
            <ChoiceCard
              key={v.key}
              title={v.label}
              count={v.count}
              icon={GraduationCap}
              onClick={() => onCoachingVariant(v.key)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground text-sm">
      Choose an option from the sidebar to continue.
    </div>
  );
}
