import { useEffect, useState } from "react";
import { Check, X, ArrowRight } from "lucide-react";
import {
  evaluateGermany,
  loadChancenkarteRules,
  loadShortageOccupations,
  type ChancenkarteRule,
  type DeEvaluation,
  type ShortageOccupation,
} from "@/lib/assessment/germany";

export function ChancenkartePanel({ answers }: { answers: Record<string, any> }) {
  const [rules, setRules] = useState<ChancenkarteRule[]>([]);
  const [shortage, setShortage] = useState<ShortageOccupation[]>([]);
  const [evalResult, setEvalResult] = useState<DeEvaluation | null>(null);

  useEffect(() => {
    (async () => {
      const [r, s] = await Promise.all([loadChancenkarteRules(), loadShortageOccupations()]);
      setRules(r); setShortage(s);
    })();
  }, []);

  useEffect(() => {
    if (!rules.length) return;
    setEvalResult(evaluateGermany(answers, rules, shortage));
  }, [answers, rules, shortage]);

  if (!evalResult) {
    return (
      <div className="flc-card p-5 space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_14%_28%)]">
          Chancenkarte points
        </div>
        <div className="text-sm text-[hsl(220_14%_45%)]">Loading rules…</div>
      </div>
    );
  }

  const { chancenkarte, pathways, recommendation } = evalResult;
  const pct = Math.min(100, Math.round((chancenkarte.total / Math.max(chancenkarte.threshold, 6)) * 100));

  return (
    <div className="flc-card p-5 sticky top-4 space-y-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_14%_28%)]">
        Chancenkarte — Advisory
      </div>
      <div className="flex items-baseline gap-2">
        <span className="flc-display text-5xl">{chancenkarte.total}</span>
        <span className="text-xs text-[hsl(220_14%_45%)]">/ {chancenkarte.threshold} pts to pass</span>
      </div>
      <div className="flc-progress"><div style={{ width: `${pct}%` }} /></div>
      <div className={`text-xs font-medium ${chancenkarte.passes ? "text-[hsl(150_55%_38%)]" : "text-[hsl(8_75%_50%)]"}`}>
        {chancenkarte.passes ? "Likely eligible for Opportunity Card" : chancenkarte.basePass ? "Below points threshold" : "Base requirements missing"}
      </div>

      <div className="space-y-1.5 pt-1 text-xs">
        {chancenkarte.factors.map((f) => (
          <div key={f.factor} className="flex items-center justify-between">
            <span className="text-[hsl(220_14%_28%)]">{f.label}</span>
            <span className="font-mono text-[hsl(220_18%_11%)]">{f.points}/{f.max}</span>
          </div>
        ))}
      </div>

      {chancenkarte.baseFailures.length > 0 && (
        <div className="pt-2 border-t border-[hsl(30_12%_88%)] space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(8_75%_50%)]">Base requirements</div>
          <ul className="text-[11px] text-[hsl(220_14%_45%)] space-y-0.5 list-disc pl-4">
            {chancenkarte.baseFailures.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      )}

      <div className="pt-2 border-t border-[hsl(30_12%_88%)] space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_14%_28%)]">Pathways</div>
        <div className="space-y-1">
          {pathways.map((p) => (
            <div key={p.code} className="flex items-center gap-2 text-xs">
              {p.status === "eligible"
                ? <Check className="size-3.5 text-[hsl(150_55%_42%)]" />
                : <X className="size-3.5 text-[hsl(220_14%_45%)]" />}
              <span className="text-[hsl(220_18%_11%)]">{p.label}</span>
              <span className={`ml-auto text-[10px] uppercase tracking-wider ${
                p.status === "eligible" ? "text-[hsl(150_55%_42%)]"
                  : p.status === "partial" ? "text-[hsl(35_80%_45%)]"
                  : "text-[hsl(220_14%_45%)]"
              }`}>{p.status.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      </div>

      {recommendation.suggestedImprovements.length > 0 && (
        <div className="pt-2 border-t border-[hsl(30_12%_88%)] space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_14%_28%)]">How to improve</div>
          <ul className="text-[11px] text-[hsl(220_14%_28%)] space-y-1">
            {recommendation.suggestedImprovements.slice(0, 3).map((s, i) => (
              <li key={i} className="flex items-start gap-1">
                <ArrowRight className="size-3 mt-0.5 text-[hsl(8_75%_60%)] shrink-0" />
                <span><span className="font-medium">{s.area}:</span> {s.action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-[10px] text-[hsl(220_14%_45%)] pt-2 border-t border-[hsl(30_12%_88%)]">
        Estimate based on self-reported answers. Final decisions are by the German embassy / Auslandsbehörde.
      </div>
    </div>
  );
}
