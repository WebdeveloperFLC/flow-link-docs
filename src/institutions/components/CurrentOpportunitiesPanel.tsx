import { Card } from "@/components/ui/card";
import { usePromotions } from "../hooks/useInstitutionData";
import { OpportunityCard, type OpportunityRecord } from "./OpportunityCard";

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return [];
}

function matchesFieldOfStudy(p: OpportunityRecord, field?: string): boolean {
  if (!field?.trim()) return true;
  const disciplines = asStringArray(p.target_disciplines);
  if (!disciplines.length) return true;
  const needle = field.toLowerCase();
  return disciplines.some((d) => d.toLowerCase().includes(needle) || needle.includes(d.toLowerCase()));
}

export function CurrentOpportunitiesPanel({
  institutionId,
  institutionName,
  fieldOfStudy,
  compact = false,
  title = "Current opportunities",
}: {
  institutionId: string;
  institutionName?: string;
  /** When set, prefer promotions targeting this program field. */
  fieldOfStudy?: string;
  compact?: boolean;
  title?: string;
}) {
  const { data: promos, loading } = usePromotions(institutionId) as {
    data: OpportunityRecord[];
    loading: boolean;
  };

  const active = (promos ?? []).filter((p) => p.is_active !== false && matchesFieldOfStudy(p, fieldOfStudy));

  if (loading) {
    return (
      <div className={compact ? "py-2 text-sm text-muted-foreground" : "p-6 text-center text-sm text-muted-foreground"}>
        Loading opportunities…
      </div>
    );
  }

  if (compact) {
    if (active.length === 0) {
      return (
        <p className="text-sm text-muted-foreground italic">
          No active offers on file — institution promotions will surface here when available.
        </p>
      );
    }
    return (
      <div className="space-y-2">
        {active.map((p) => (
          <OpportunityCard key={p.id} opportunity={p} institutionName={institutionName} compact />
        ))}
      </div>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Scholarships, fee waivers, discounts, and promotions — AI auto-population reserved for a future sprint.
        </p>
      </div>

      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No active opportunities on file. Add promotions or upload knowledge sources to detect offers later.
        </p>
      ) : (
        <div className="space-y-2">
          {active.map((p) => (
            <OpportunityCard key={p.id} opportunity={p} institutionName={institutionName} />
          ))}
        </div>
      )}
    </Card>
  );
}
