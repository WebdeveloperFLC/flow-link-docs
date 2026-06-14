import { Card } from "@/components/ui/card";
import { OFFER_CONFLICT_RULES } from "@/incentives/lib/offerManagementLogic";

export function PerformanceOfferConflictPanel() {
  return (
    <Card className="p-5 ph-surface-card h-full">
      <h2 className="text-lg font-semibold ph-heading">Conflict resolution rules</h2>
      <p className="text-xs ph-muted mt-1 mb-4">When multiple offers qualify</p>
      <div className="rounded-lg border px-3 py-2 mb-4 text-sm">
        <span className="font-medium ph-heading">Resolution strategy: </span>
        <span className="ph-muted">Best for client (default)</span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {OFFER_CONFLICT_RULES.map((r) => (
            <tr key={r.rule} className="border-b last:border-0">
              <td className="py-2 pr-3 font-medium ph-heading whitespace-nowrap">{r.rule}</td>
              <td className="py-2 ph-muted">{r.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
