import { Card } from "@/components/ui/card";
import { BASE_CONFIG_ITEMS, CLIENT_TYPE_RULES } from "@/incentives/lib/incentivePlansCmsLogic";

export function PerformanceIncentiveBaseRulesPanel() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-5 ph-surface-card">
        <h2 className="text-lg font-semibold ph-heading mb-4">Incentive base configuration</h2>
        <div className="text-xs ph-muted mb-3">Compute incentive on</div>
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="rounded-full px-3 py-1 text-xs font-medium bg-[var(--blue)] text-white">Net revenue</span>
          <span className="rounded-full px-3 py-1 text-xs font-medium border ph-muted">Gross revenue</span>
          <span className="rounded-full px-3 py-1 text-xs font-medium border ph-muted">Profit</span>
          <span className="rounded-full px-3 py-1 text-xs font-medium border ph-muted">Margin</span>
        </div>
        <div className="text-xs ph-muted mb-2">Do these reduce the incentive base?</div>
        <div className="space-y-3">
          {BASE_CONFIG_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className="ph-heading font-medium">{item.label}</span>
              <span className={item.reducesBase ? "text-emerald-700 text-xs font-semibold" : "ph-muted text-xs"}>
                {item.reducesBase ? "Yes" : "No"}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 ph-surface-card">
        <h2 className="text-lg font-semibold ph-heading mb-4">Rules by client type</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left ph-muted text-xs uppercase tracking-wide">
              <th className="py-2 pr-3">Client type</th>
              <th className="py-2 pr-3">Incentive treatment</th>
            </tr>
          </thead>
          <tbody>
            {CLIENT_TYPE_RULES.map((r) => (
              <tr key={r.clientType} className="border-b last:border-0">
                <td className="py-2 pr-3 font-medium ph-heading">{r.clientType}</td>
                <td className="py-2 pr-3 ph-muted text-xs">{r.treatment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
