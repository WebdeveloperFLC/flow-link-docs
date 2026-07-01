import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Gift, Megaphone, TrendingUp } from "lucide-react";

export type NextActionItem = {
  id: string;
  label: string;
  detail: string;
  to: string;
  primary?: boolean;
};

interface NextActionsCardProps {
  actions: NextActionItem[];
  loading?: boolean;
}

/** Dashboard Q4 — 2–3 routed best moves for today. */
export function NextActionsCard({ actions, loading }: NextActionsCardProps) {
  const visible = actions.slice(0, 3);

  return (
    <Card className="p-5 ph-surface-card">
      <p className="text-[11px] uppercase tracking-wide ph-muted font-medium mb-3">What should I do today?</p>

      {loading ? (
        <p className="text-sm ph-muted">…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm ph-muted">No suggested actions — check your wallet and client queue.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((action) => (
            <li key={action.id}>
              <Link
                to={action.to}
                className="flex items-start gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/40 transition-colors group"
              >
                <span className="mt-0.5 text-primary">
                  {action.id.includes("discount") ? (
                    <Gift className="size-4" />
                  ) : action.id.includes("offer") ? (
                    <Megaphone className="size-4" />
                  ) : (
                    <TrendingUp className="size-4" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium group-hover:text-primary">{action.label}</p>
                  <p className="text-xs ph-muted mt-0.5">{action.detail}</p>
                </div>
                <ChevronRight className="size-4 ph-muted shrink-0 mt-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border/60">
        <Button size="sm" asChild>
          <Link to="/performance/give-discount">Give discount</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link to="/performance/offers/requests">Promotion request</Link>
        </Button>
      </div>
    </Card>
  );
}
