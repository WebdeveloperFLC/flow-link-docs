import { Badge } from "@/components/ui/badge";
import { Gift, Percent, Tag, CalendarDays, Building2, FileText, Globe } from "lucide-react";

export type OpportunityRecord = {
  id: string;
  title: string;
  promo_type?: string | null;
  description?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  is_active?: boolean | null;
  auto_detected?: boolean | null;
  detection_source?: string | null;
  target_disciplines?: unknown;
  target_countries?: unknown;
  metadata?: Record<string, unknown> | null;
  institution_id?: string | null;
};

function promoIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes("scholar")) return Gift;
  if (t.includes("waiver") || t.includes("fee") || t.includes("discount")) return Percent;
  return Tag;
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v];
  return [];
}

function priorityLabel(metadata: Record<string, unknown> | null | undefined): string | null {
  const p = metadata?.priority;
  if (p == null || p === "") return null;
  return String(p);
}

function statusLabel(active: boolean | null | undefined): string {
  if (active === false) return "Inactive";
  return "Active";
}

export function OpportunityCard({
  opportunity: p,
  institutionName,
  compact = false,
}: {
  opportunity: OpportunityRecord;
  institutionName?: string;
  compact?: boolean;
}) {
  const Icon = promoIcon(p.promo_type ?? "");
  const disciplines = asStringArray(p.target_disciplines);
  const countries = asStringArray(p.target_countries);
  const priority = priorityLabel(p.metadata ?? null);
  const source = p.auto_detected
    ? p.detection_source ?? "AI detected"
    : "Manual entry";

  return (
    <div className={`rounded-md border p-3 space-y-2 ${compact ? "text-xs" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="size-4 text-primary shrink-0" />
          <span className={`font-medium truncate ${compact ? "text-sm" : ""}`}>{p.title}</span>
        </div>
        <Badge variant={p.is_active !== false ? "default" : "secondary"} className="shrink-0 text-[10px]">
          {statusLabel(p.is_active)}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 capitalize">
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
        {countries.length > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Globe className="size-3" /> {countries.join(", ")}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <FileText className="size-3" /> Source: {source}
        </span>
        {priority ? (
          <span className="inline-flex items-center gap-1">Priority: {priority}</span>
        ) : null}
      </div>
      {disciplines.length > 0 && (
        <div className="text-xs">
          <span className="text-muted-foreground">Programs: </span>
          {disciplines.join(", ")}
        </div>
      )}
      {p.description && !compact ? (
        <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
      ) : null}
    </div>
  );
}
