import { Card } from "@/components/ui/card";
import type { CrmHealthCheck } from "@/incentives/lib/autoApplyPolicyLogic";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";

interface PerformanceCrmHealthPanelProps {
  checks: CrmHealthCheck[];
  loading?: boolean;
}

function dotClass(status: CrmHealthCheck["status"]) {
  if (status === "warn") return "bg-amber-500";
  if (status === "error") return "bg-red-500";
  return "bg-emerald-500";
}

export function PerformanceCrmHealthPanel({ checks, loading }: PerformanceCrmHealthPanelProps) {
  return (
    <Card className="p-5 ph-surface-card h-full">
      <h2 className="text-lg font-semibold ph-heading mb-4">Sync & integration health</h2>
      {loading ? (
        <p className="text-sm ph-muted">Checking integration…</p>
      ) : (
        <>
          <div className="space-y-3">
            {checks.map((c) => (
              <div key={c.key} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full shrink-0", dotClass(c.status))} />
                  <span className="ph-muted">{c.label}</span>
                </div>
                <span className="font-semibold ph-heading uppercase text-xs">
                  {c.status === "ok" ? "OK" : c.detail ?? c.status}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t my-4" />
          <div className="text-xs ph-muted uppercase tracking-wide mb-2">Integration pattern</div>
          <div className="rounded-lg border ph-surface-card p-3 flex gap-3 text-sm">
            <Layers className="size-5 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
            <p className="ph-muted text-xs">
              CRM is system-of-record for entities and leads. CMS subscribes to CRM change events and references entities
              by ID — consolidated reporting spans all companies, branches, countries and users.
            </p>
          </div>
        </>
      )}
    </Card>
  );
}
