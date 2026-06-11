import { ExternalLink, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ServiceFeeBreakdownView } from "@/lib/service-library/feeBreakdown/types";

type Props = {
  breakdown: ServiceFeeBreakdownView;
  /** MBBS: university fees are quoted on official site — INR column often empty. */
  isMbbs?: boolean;
};

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function ServiceFeeBreakdownPanel({ breakdown, isMbbs }: Props) {
  const { govt, consultancy } = breakdown;
  const applicableGovt = govt?.items.filter((i) => i.applicable) ?? [];
  const notApplicableGovt = govt?.items.filter((i) => !i.applicable) ?? [];

  return (
    <div className="space-y-4">
      {consultancy && consultancy.packages.length > 0 && (
        <Card className="p-5 shadow-elev-sm border-primary/20">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-base">Consultancy fees (India market)</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Future Link standard service charges in INR — documentation, filing, and counselor support.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {consultancy.lastVerified && (
                <Badge variant="outline">Updated {consultancy.lastVerified}</Badge>
              )}
              <Badge variant="secondary">{consultancy.packages.length} package(s)</Badge>
            </div>
          </div>

          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm border-collapse min-w-[480px]">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-2 font-medium">Service package</th>
                  <th className="py-2 px-2 font-medium text-right">Fee (INR)</th>
                  <th className="py-2 px-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {consultancy.packages.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="py-3 px-2 align-top">
                      <div className="font-medium">{row.label}</div>
                      {row.unit && (
                        <div className="text-xs text-muted-foreground mt-0.5">{row.unit}</div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right tabular-nums align-top font-semibold text-primary whitespace-nowrap">
                      {formatInr(row.amountInr)}
                    </td>
                    <td className="py-3 px-2 align-top text-xs text-muted-foreground max-w-xs">
                      {row.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 mt-4">
            <Info className="size-4 shrink-0 mt-0.5" />
            <p>{consultancy.disclaimer}</p>
          </div>
        </Card>
      )}

      {govt && (
        <Card className="p-5 shadow-elev-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-base">
                {isMbbs ? "University & official fees" : "Government & official fees"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isMbbs
                  ? "Tuition changes each year — confirm on the official university fee page. Detailed ranges are in the program cost breakdown below."
                  : `Itemised charges in ${govt.nativeCurrency} with INR equivalent for counselor reference.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {govt.lastVerified && (
                <Badge variant="outline">Verified {govt.lastVerified}</Badge>
              )}
              <Badge variant="secondary">{govt.applicableCount} applicable</Badge>
            </div>
          </div>

          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm border-collapse min-w-[520px]">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-2 font-medium">Fee type</th>
                  <th className="py-2 px-2 font-medium text-right">Native ({govt.nativeCurrency})</th>
                  <th className="py-2 px-2 font-medium text-right">INR (approx)</th>
                  <th className="py-2 px-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {applicableGovt.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="py-3 px-2 align-top">
                      <div className="font-medium">{row.label}</div>
                      {row.unit && (
                        <div className="text-xs text-muted-foreground mt-0.5">{row.unit}</div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right tabular-nums align-top font-medium whitespace-nowrap">
                      {row.nativeDisplay}
                    </td>
                    <td className="py-3 px-2 text-right tabular-nums align-top text-muted-foreground whitespace-nowrap">
                      {row.inrDisplay ?? "—"}
                    </td>
                    <td className="py-3 px-2 align-top text-xs text-muted-foreground max-w-xs">
                      {row.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {govt.sourceUrl && (
            <a
              href={govt.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-4"
            >
              Official fee source
              <ExternalLink className="size-3" />
            </a>
          )}
        </Card>
      )}

      {notApplicableGovt.length > 0 && (
        <Card className="p-5 shadow-elev-sm bg-muted/20">
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Not applicable for this route</h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {notApplicableGovt.map((row) => (
              <li key={row.id} className="flex gap-2 text-muted-foreground">
                <span className="shrink-0">—</span>
                <span>
                  <span className="font-medium text-foreground/70">{row.label}</span>
                  {row.notes && <span className="block text-xs mt-0.5">{row.notes}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {govt && (
        <div className="flex gap-2 text-xs text-muted-foreground bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
          <Info className="size-4 shrink-0 text-amber-600 mt-0.5" />
          <p>{govt.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
