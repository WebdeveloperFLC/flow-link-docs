import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { evaluatePathways, findProvincialMatches, ieltsOverallToClb, loadPathwayRules, type EligibilityResult, type NocOccupation, type ProvincialMatch } from "@/lib/noc";

// Use the lowest of the four module bands (IRCC's "CLB across abilities") rather than overall.
function minIeltsBand(a: Record<string, any>): number {
  const vals = ["english_listening", "english_reading", "english_writing", "english_speaking"]
    .map((k) => Number(a[k]))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (vals.length < 4) return 0;
  return Math.min(...vals);
}

export function PathwayEligibilityPanel({
  noc,
  answers,
}: {
  noc: NocOccupation | null;
  answers: Record<string, any>;
}) {
  const [results, setResults] = useState<EligibilityResult[]>([]);
  const [provincial, setProvincial] = useState<ProvincialMatch[]>([]);

  useEffect(() => {
    if (!noc) { setResults([]); setProvincial([]); return; }
    const minBand = minIeltsBand(answers);
    if (minBand <= 0) { setResults([]); setProvincial([]); return; }
    (async () => {
      const rules = await loadPathwayRules();
      const clb = ieltsOverallToClb(minBand);
      const r = evaluatePathways(rules, {
        noc,
        foreignYears: Number(answers.work_experience_years ?? 0),
        canadianYears: Number(answers.canadian_work_experience ?? 0),
        clb,
        jobOffer: !!answers.job_offer,
      });
      setResults(r);
      const province = Array.isArray(answers.province_preference) && answers.province_preference.length === 1
        ? answers.province_preference[0]
        : undefined;
      const pm = await findProvincialMatches(noc, province);
      setProvincial(pm);
    })();
  }, [noc, answers.work_experience_years, answers.canadian_work_experience,
      answers.english_listening, answers.english_reading, answers.english_writing, answers.english_speaking,
      answers.job_offer, JSON.stringify(answers.province_preference)]);

  if (!noc) return null;

  // Gate: don't show pathway verdicts until all four language scores are entered.
  const ready = minIeltsBand(answers) > 0;
  if (!ready) {
    return (
      <div className="rounded-xl bg-[hsl(36_20%_94%)] p-4 text-xs text-[hsl(220_14%_28%)]">
        Complete the language test section (all four module scores) to calculate accurate pathway eligibility.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[hsl(36_20%_94%)] p-4 space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_14%_28%)]">
        Pathways you may qualify for
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {results.map((r) => (
          <div key={r.pathway} className={`rounded-lg border p-2.5 text-xs space-y-1 bg-white ${r.eligible ? "border-[hsl(150_55%_42%)]" : "border-[hsl(30_12%_82%)]"}`}>
            <div className="flex items-center gap-2">
              {r.eligible
                ? <Check className="size-3.5 text-[hsl(150_55%_42%)]" />
                : <X className="size-3.5 text-[hsl(220_14%_45%)]" />}
              <span className="font-medium text-[hsl(220_18%_11%)]">{r.label}</span>
            </div>
            {!r.eligible && r.reasons.length > 0 && (
              <ul className="text-[11px] text-[hsl(220_14%_45%)] pl-5 list-disc space-y-0.5">
                {r.reasons.slice(0, 2).map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
      {provincial.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_14%_28%)]">Provincial matches</div>
          <div className="flex flex-wrap gap-1.5">
            {provincial.slice(0, 8).map((p, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-[hsl(30_12%_82%)] text-[hsl(220_18%_11%)]">
                {p.province_code} · {p.stream_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}