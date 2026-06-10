import { ExternalLink, Info, Briefcase, Globe2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CountryInsightsView, WorkingRightsBlock } from "@/lib/service-library/countryInsights/types";
import { ServiceFullCostBreakdownCard } from "./ServiceFullCostBreakdownCard";

type Props = {
  insights: CountryInsightsView;
};

function RightsBlock({ title, block }: { title: string; block: WorkingRightsBlock }) {
  if (!block?.summary) return null;
  return (
    <Card className="p-5 shadow-elev-sm">
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="size-4 text-primary" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-foreground mb-3">{block.summary}</p>
      {block.details?.length > 0 && (
        <ul className="space-y-2 text-sm mb-3">
          {block.details.map((d) => (
            <li key={d} className="flex gap-2">
              <span className="text-primary shrink-0">•</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      )}
      {block.restrictions && block.restrictions.length > 0 && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 mb-3">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">Restrictions</p>
          <ul className="text-xs space-y-1">
            {block.restrictions.map((r) => (
              <li key={r}>— {r}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {block.lastVerified && <Badge variant="outline">Verified {block.lastVerified}</Badge>}
        {block.sourceUrl && (
          <a
            href={block.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Official source <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </Card>
  );
}

function formatAmount(item: {
  amount?: number | null;
  range?: string | null;
  currency?: string;
  unit?: string;
}): string {
  const cur = item.currency ?? "";
  if (item.range) return `${cur ? `${cur} ` : ""}${item.range}${item.unit ? ` ${item.unit}` : ""}`.trim();
  if (item.amount != null) return `${cur ? `${cur} ` : ""}${item.amount.toLocaleString()}${item.unit ? ` ${item.unit}` : ""}`.trim();
  return "Varies";
}

export function ServiceCountryInsightsPanel({ insights }: Props) {
  const { countryProfile, workingRights, fullCostBreakdown, factsTitle } = insights;

  return (
    <div className="space-y-4">
      {countryProfile && countryProfile.facts.length > 0 && (
        <Card className="p-5 shadow-elev-sm">
          <div className="flex items-center gap-2 mb-4">
            <Globe2 className="size-4 text-primary" />
            <h3 className="font-semibold text-base">{factsTitle}</h3>
          </div>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {countryProfile.facts.map((f) => (
              <div key={f.label}>
                <dt className="text-muted-foreground font-medium">{f.label}</dt>
                <dd className="mt-0.5">{f.value}</dd>
                {f.note && <dd className="text-xs text-muted-foreground mt-0.5">{f.note}</dd>}
              </div>
            ))}
          </dl>
        </Card>
      )}

      {countryProfile?.costOfLiving && (
        <Card className="p-5 shadow-elev-sm">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-primary" />
              <h3 className="font-semibold text-base">Cost of living in {countryProfile.country}</h3>
            </div>
            <Badge variant="outline">Updated {countryProfile.costOfLiving.lastVerified}</Badge>
          </div>
          {countryProfile.costOfLiving.summary && (
            <p className="text-sm text-muted-foreground mb-4">{countryProfile.costOfLiving.summary}</p>
          )}
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm border-collapse min-w-[420px]">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-2 font-medium">Item</th>
                  <th className="py-2 px-2 font-medium text-right">Amount / range</th>
                  <th className="py-2 px-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {countryProfile.costOfLiving.items.map((row) => (
                  <tr key={row.label} className="border-b border-border/60">
                    <td className="py-2.5 px-2 align-top font-medium">{row.label}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums align-top whitespace-nowrap">
                      {row.amount ?? row.range ?? "—"}
                      {row.unit ? ` ${row.unit}` : ""}
                    </td>
                    <td className="py-2.5 px-2 align-top text-xs text-muted-foreground max-w-xs">
                      {row.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {countryProfile.costOfLiving.notes && countryProfile.costOfLiving.notes.length > 0 && (
            <ul className="mt-4 text-xs text-muted-foreground space-y-1 list-disc pl-4">
              {countryProfile.costOfLiving.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          {countryProfile.costOfLiving.sourceUrl && (
            <a
              href={countryProfile.costOfLiving.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary mt-3 hover:underline"
            >
              Official living-cost guidance <ExternalLink className="size-3" />
            </a>
          )}
        </Card>
      )}

      {workingRights && (
        <div className="grid md:grid-cols-2 gap-4">
          <RightsBlock title="Working rights — applicant" block={workingRights.applicant} />
          <RightsBlock title="Working rights — spouse / partner" block={workingRights.spouse} />
        </div>
      )}

      {fullCostBreakdown && fullCostBreakdown.sections.length > 0 && (
        <ServiceFullCostBreakdownCard breakdown={fullCostBreakdown} />
      )}
    </div>
  );
}
