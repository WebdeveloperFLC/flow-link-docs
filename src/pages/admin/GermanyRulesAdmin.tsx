import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import type { ChancenkarteRule, ShortageOccupation } from "@/lib/assessment/germany";

export default function GermanyRulesAdmin() {
  const [rules, setRules] = useState<ChancenkarteRule[]>([]);
  const [shortage, setShortage] = useState<ShortageOccupation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [r, s] = await Promise.all([
        supabase.from("de_chancenkarte_rules" as any).select("*").order("order_index"),
        supabase.from("de_shortage_occupations" as any).select("*").order("label"),
      ]);
      setRules(((r.data ?? []) as unknown) as ChancenkarteRule[]);
      setShortage(((s.data ?? []) as unknown) as ShortageOccupation[]);
      setLoading(false);
    })();
  }, []);

  return (
    <AppLayout>
      <PageHeader
        title="Germany — Chancenkarte Rules"
        description="Admin-editable points engine and shortage occupations for the Germany assessment pathway."
      />
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div>
        ) : (
          <>
            <Card className="p-5 space-y-4">
              <div className="font-semibold">Chancenkarte point factors</div>
              <div className="text-xs text-muted-foreground">
                Edit factor weights and tiers directly in the database (admin-only). Pass threshold defaults to 6 points.
              </div>
              <div className="space-y-3">
                {rules.map((r) => (
                  <div key={r.id} className="border rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{r.label}</div>
                      <Badge variant="secondary">max {r.max_points} pts</Badge>
                    </div>
                    {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                    <ul className="text-xs space-y-0.5">
                      {(r.tiers ?? []).map((t, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted">
                            {typeof t.points === "number" ? `${t.points} pts` : t.threshold !== undefined ? `≥ ${t.threshold}` : "—"}
                          </span>
                          <span>{t.label ?? JSON.stringify(t.when ?? {})}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="font-semibold">Shortage / demand occupations</div>
              <div className="text-xs text-muted-foreground">
                Used by the engine to auto-detect a shortage match from the applicant's free-text occupation.
              </div>
              <div className="flex flex-wrap gap-1.5">
                {shortage.map((s) => (
                  <Badge key={s.id} variant="outline" title={(s.keywords ?? []).join(", ")}>
                    {s.label}{s.category ? ` · ${s.category}` : ""}
                  </Badge>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
