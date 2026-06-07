import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { normalizeAcademyMetadata, type ServiceAcademyMetadata } from "@/lib/service-library/academyTypes";
import type { Master } from "@/lib/serviceLibrary";

type Props = {
  master: Master & { service_library_countries?: { country: string }[] };
  compact?: boolean;
};

type Check = { id: string; label: string; ok: boolean; detail?: string };

function buildChecks(meta: ServiceAcademyMetadata, master: Props["master"]): Check[] {
  const quiz = meta.quiz ?? [];
  const byLevel = { 1: 0, 2: 0, 3: 0 };
  for (const q of quiz) {
    const lv = q.level ?? 1;
    if (lv === 1 || lv === 2 || lv === 3) byLevel[lv]++;
  }

  const countries = (master.service_library_countries ?? []).map((c) => c.country);

  return [
    {
      id: "display",
      label: "Display name & header",
      ok: !!(meta.displayName && meta.shortDescription),
      detail: meta.displayName ? meta.displayName : "Missing displayName",
    },
    {
      id: "countries",
      label: "Country mapping",
      ok: master.service_category !== "visa_immigration" || countries.length > 0,
      detail: countries.length ? countries.join(", ") : "Assign in Countries tab",
    },
    {
      id: "kpis",
      label: "KPIs",
      ok: (meta.kpis?.length ?? 0) >= 3,
      detail: `${meta.kpis?.length ?? 0} KPIs`,
    },
    {
      id: "redflags",
      label: "Red flags",
      ok: (meta.redFlags?.length ?? 0) > 0,
      detail: `${meta.redFlags?.length ?? 0} items`,
    },
    {
      id: "quiz",
      label: "Quiz questions",
      ok: quiz.length >= 15,
      detail: `${quiz.length} total · L1 ${byLevel[1]} · L2 ${byLevel[2]} · L3 ${byLevel[3]}`,
    },
    {
      id: "sampledocs",
      label: "Sample docs",
      ok: (meta.sampleDocs?.length ?? 0) > 0,
      detail: `${meta.sampleDocs?.length ?? 0} specimens`,
    },
    {
      id: "timeline",
      label: "Process timeline",
      ok: (meta.timeline?.length ?? 0) > 0 || (Array.isArray(master.process_flow) && master.process_flow.length > 0),
      detail: meta.timeline?.length
        ? `${meta.timeline.length} timeline steps`
        : Array.isArray(master.process_flow) && master.process_flow.length
          ? `${master.process_flow.length} process_flow steps`
          : "Add timeline in Service content",
    },
    {
      id: "faqs",
      label: "FAQs",
      ok: (meta.faqs?.length ?? 0) >= 30,
      detail: `${meta.faqs?.length ?? 0} FAQs (target 30)`,
    },
    {
      id: "resources",
      label: "Resources / downloads links",
      ok: (meta.resources?.length ?? 0) > 0,
      detail: `${meta.resources?.length ?? 0} links`,
    },
  ];
}

export function ContentSetupSummary({ master, compact }: Props) {
  const meta = normalizeAcademyMetadata(master.academy_metadata);
  const checks = buildChecks(meta, master);
  const done = checks.filter((c) => c.ok).length;
  const total = checks.length;
  const complete = done === total;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={complete ? "default" : "secondary"}>
          {done}/{total} content sections ready
        </Badge>
        {!complete && (
          <span className="text-xs text-muted-foreground">Open Service content tab to finish setup</span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Counselor content setup</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Matches what counselors see in Service Library tabs (Overview, Red flags, Quiz, Sample docs, etc.)
          </p>
        </div>
        <Badge variant={complete ? "default" : "outline"} className="shrink-0 tabular-nums">
          {done}/{total}
        </Badge>
      </div>
      <ul className="grid sm:grid-cols-2 gap-2">
        {checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2 text-sm">
            {c.ok ? (
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <div className={c.ok ? "text-foreground" : "text-foreground font-medium"}>{c.label}</div>
              {c.detail && <div className="text-[11px] text-muted-foreground truncate">{c.detail}</div>}
            </div>
          </li>
        ))}
      </ul>
      {!complete && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1 border-t">
          <Circle className="size-3" />
          Use the <strong>Service content</strong> tab → Bulk JSON to upload full Canada JSON, or fill Quiz / Sample docs / Process tabs.
        </p>
      )}
    </div>
  );
}
