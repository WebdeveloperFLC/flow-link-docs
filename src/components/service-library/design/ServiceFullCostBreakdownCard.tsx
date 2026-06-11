import { ExternalLink, Info, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FullCostBreakdown } from "@/lib/service-library/countryInsights/types";
import { formatFullCostAmount } from "@/lib/service-library/countryInsights/formatFullCostAmount";

type Props = {
  breakdown: FullCostBreakdown;
  /** When true, emphasize tuition / university fees (Fees tab). */
  emphasizeTuition?: boolean;
};

export function ServiceFullCostBreakdownCard({ breakdown, emphasizeTuition }: Props) {
  return (
    <Card className="p-5 shadow-elev-sm border-primary/15">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Wallet className="size-4 text-primary" />
            {breakdown.title ?? "Full cost breakdown — fees, tuition, living & miscellaneous"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {emphasizeTuition
              ? "University tuition and program costs — always confirm current rates on the official fee page before quoting clients."
              : "Indicative totals for counseling conversations — verify official fees before quoting."}
          </p>
        </div>
        <Badge variant="outline">Updated {breakdown.lastVerified}</Badge>
      </div>

      {breakdown.sections.map((section) => (
        <div key={section.id} className="mb-5 last:mb-0">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {section.label}
          </h4>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm border-collapse min-w-[480px]">
              <tbody>
                {section.items.map((item) => (
                  <tr
                    key={item.label}
                    className={`border-b border-border/60 ${item.applicable === false ? "opacity-50" : ""}`}
                  >
                    <td className="py-2.5 px-2 align-top font-medium w-[40%]">{item.label}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums align-top whitespace-nowrap">
                      {formatFullCostAmount(item, breakdown.currency)}
                    </td>
                    <td className="py-2.5 px-2 align-top text-xs text-muted-foreground max-w-sm">
                      {item.notes ?? (item.applicable === false ? "Not applicable" : "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {breakdown.totals && breakdown.totals.length > 0 && (
        <div className="rounded-lg bg-muted/40 p-4 mt-4 space-y-2">
          {breakdown.totals.map((t) => (
            <div key={t.label} className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="font-medium">{t.label}</span>
              <span className="tabular-nums font-semibold text-primary">{t.value}</span>
              {t.notes && <span className="text-xs text-muted-foreground w-full">{t.notes}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 mt-4">
        <Info className="size-4 shrink-0 mt-0.5" />
        <p>
          {breakdown.disclaimer}
          {breakdown.sourceUrl && (
            <>
              {" "}
              <a
                href={breakdown.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Official tuition & fees <ExternalLink className="size-3" />
              </a>
            </>
          )}
        </p>
      </div>
    </Card>
  );
}
