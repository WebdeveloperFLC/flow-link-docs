import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Percent, Tag, CalendarDays, Building2, FileText } from "lucide-react";
import { usePromotions } from "../hooks/useInstitutionData";

function promoIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes("scholar")) return Gift;
  if (t.includes("waiver") || t.includes("fee")) return Percent;
  return Tag;
}

export function CurrentOpportunitiesPanel({
  institutionId,
  institutionName,
}: {
  institutionId: string;
  institutionName?: string;
}) {
  const { data: promos, loading } = usePromotions(institutionId) as {
    data: any[];
    loading: boolean;
  };

  if (loading) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Loading opportunities…</div>;
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <div className="text-sm font-medium">Current opportunities</div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Scholarships, fee waivers, discounts, and promotions — populated from institution records today; AI
          detection reserved for a future sprint.
        </p>
      </div>

      {promos.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No active opportunities on file. Add promotions or upload knowledge sources to detect offers later.
        </p>
      ) : (
        <div className="space-y-2">
          {promos.map((p) => {
            const Icon = promoIcon(p.promo_type ?? "");
            const disciplines = (p.target_disciplines ?? []) as string[];
            return (
              <div key={p.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="size-4 text-primary shrink-0" />
                    <span className="font-medium truncate">{p.title}</span>
                  </div>
                  <Badge variant={p.is_active ? "default" : "secondary"} className="shrink-0">
                    {p.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Tag className="size-3" /> {p.promo_type ?? "promotion"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3" />
                    {p.valid_from ?? "—"} → {p.valid_to ?? "—"}
                  </span>
                  {institutionName ? (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="size-3" /> {institutionName}
                    </span>
                  ) : null}
                  {p.auto_detected ? (
                    <span className="inline-flex items-center gap-1">
                      <FileText className="size-3" /> Source: {p.detection_source ?? "AI detected"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <FileText className="size-3" /> Manual entry
                    </span>
                  )}
                </div>
                {disciplines.length > 0 && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Programs affected: </span>
                    {disciplines.join(", ")}
                  </div>
                )}
                {p.description ? (
                  <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
