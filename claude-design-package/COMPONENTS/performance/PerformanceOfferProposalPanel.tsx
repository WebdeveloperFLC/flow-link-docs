import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";

export interface OfferProposalPreview {
  id: string;
  title: string;
  requesterName: string;
  statusLabel: string;
  statusClass: string;
}

interface PerformanceOfferProposalPanelProps {
  items: OfferProposalPreview[];
  loading?: boolean;
}

export function PerformanceOfferProposalPanel({ items, loading }: PerformanceOfferProposalPanelProps) {
  return (
    <Card className="p-5 ph-surface-card h-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold ph-heading flex items-center gap-2">
          <Megaphone className="size-5" />
          Offer proposal workflow
        </h2>
        <Link to="/performance/offers/requests" className="text-xs hover:underline" style={{ color: "var(--blue)" }}>
          View all →
        </Link>
      </div>
      <p className="text-xs ph-muted mb-4">Counselors and branch managers propose; management approves or rejects.</p>
      {loading ? (
        <p className="text-sm ph-muted">Loading proposals…</p>
      ) : items.length === 0 ? (
        <p className="text-sm ph-muted">No open promotion proposals.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-2 border-b last:border-0 pb-3 last:pb-0">
              <div className="min-w-0">
                <p className="font-medium ph-heading text-sm truncate">{p.title}</p>
                <p className="text-xs ph-muted">{p.requesterName}</p>
              </div>
              <Badge variant="secondary" className={p.statusClass}>
                {p.statusLabel}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <Button asChild variant="outline" className="w-full mt-4">
        <Link to="/performance/offers/requests">Open promotion requests</Link>
      </Button>
    </Card>
  );
}
