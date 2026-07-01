import { Link } from "react-router-dom";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import { usePerformanceQueueCounts } from "@/hooks/usePerformanceQueueCounts";
import { useAuth } from "@/contexts/AuthContext";

/** Persistent exception count on hub chrome (Gap Analysis Phase 8). */
export function PerformanceHubQueueBadge() {
  const { period } = usePerformancePeriod();
  const { isAdmin, hasRole } = useAuth();
  const queues = usePerformanceQueueCounts(period);

  const show =
    isAdmin ||
    hasRole(["manager", "administrator", "director", "viewer", "commission_admin"]);

  if (!show) return null;

  const total =
    queues.unclassified +
    queues.pendingApprovals +
    queues.promotionRequests +
    queues.walletExceptions;

  if (queues.loading || total === 0) return null;

  return (
    <Link
      to="/performance/admin"
      className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 text-amber-100 px-2.5 py-0.5 text-xs font-medium hover:bg-amber-500/30 transition-colors shrink-0"
      title="Open command center queues"
    >
      <span className="size-1.5 rounded-full bg-amber-400" aria-hidden />
      {total} queue{total === 1 ? "" : "s"}
    </Link>
  );
}
