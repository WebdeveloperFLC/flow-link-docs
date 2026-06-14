import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { OfferEligibilityRuleRow } from "@/incentives/lib/offerEligibilityLogic";
import { ruleScopeSummary } from "@/incentives/lib/offerEligibilityLogic";
import { cn } from "@/lib/utils";

interface PerformanceOfferEligibilityTableProps {
  rows: OfferEligibilityRuleRow[];
  loading?: boolean;
}

export function PerformanceOfferEligibilityTable({ rows, loading }: PerformanceOfferEligibilityTableProps) {
  return (
    <Card className="p-5 ph-surface-card">
      <h2 className="text-lg font-semibold ph-heading mb-1">Eligibility rules</h2>
      <p className="text-xs ph-muted mb-4">Config-as-data policies wired into offers_eligible_for_client</p>
      {loading ? (
        <p className="text-sm ph-muted">Loading rules…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm ph-muted">
          No eligibility rules yet. Apply migration 20260718120001, then add a global or offer-specific rule.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left ph-muted text-xs uppercase tracking-wide">
                <th className="py-3 pr-3">Scope</th>
                <th className="py-3 pr-3">Audience</th>
                <th className="py-3 pr-3">Block active service</th>
                <th className="py-3 pr-3">Service / country</th>
                <th className="py-3 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-3 pr-3">
                    <div className="font-semibold ph-heading">{r.offerTitle}</div>
                    <div className="text-xs ph-muted">{ruleScopeSummary(r)}</div>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge variant="secondary" className="border-0 bg-[var(--blueBg)] text-[var(--blue)]">
                      {r.audienceLabel}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3">{r.blockIfActiveService ? "Yes" : "No"}</td>
                  <td className="py-3 pr-3 text-xs ph-muted font-mono max-w-[200px] truncate">
                    {r.scopeServiceCode ?? r.scopeCountryTag ?? r.scopeMasterKey ?? "—"}
                  </td>
                  <td className="py-3 pr-3">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "border-0",
                        r.isActive ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {r.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
