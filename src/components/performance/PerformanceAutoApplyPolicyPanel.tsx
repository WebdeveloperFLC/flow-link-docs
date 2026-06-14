import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AUTOAPPLY_ENTITIES,
  POLICY_LABELS,
  type AutoApplyPolicy,
  type AutoApplyPolicyRow,
} from "@/incentives/lib/autoApplyPolicyLogic";

interface PerformanceAutoApplyPolicyPanelProps {
  rows: AutoApplyPolicyRow[];
  loading?: boolean;
  canEdit?: boolean;
  saving?: string | null;
  onChange: (entityType: string, policy: AutoApplyPolicy) => void;
}

export function PerformanceAutoApplyPolicyPanel({
  rows,
  loading,
  canEdit,
  saving,
  onChange,
}: PerformanceAutoApplyPolicyPanelProps) {
  return (
    <Card className="p-5 ph-surface-card h-full">
      <h2 className="text-lg font-semibold ph-heading mb-1">Auto-apply to new CRM records</h2>
      <p className="text-xs ph-muted mb-4">
        When the CRM adds a new country, service, institution, program or intake, decide how existing commercial rules
        treat it.
      </p>
      {loading ? (
        <p className="text-sm ph-muted">Loading policies…</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const cfg = AUTOAPPLY_ENTITIES.find((e) => e.entityType === row.entityType);
            return (
              <div key={row.entityType} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex-1">
                  <div className="font-semibold text-sm ph-heading">{row.title}</div>
                  <div className="text-xs ph-muted">{row.hint}</div>
                </div>
                <div className="w-full sm:w-48">
                  <Label className="sr-only">{row.title} policy</Label>
                  <Select
                    value={row.policy}
                    disabled={!canEdit || saving === row.entityType}
                    onValueChange={(v) => onChange(row.entityType, v as AutoApplyPolicy)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(cfg?.allowedPolicies ?? [row.policy]).map((p) => (
                        <SelectItem key={p} value={p}>
                          {POLICY_LABELS[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
