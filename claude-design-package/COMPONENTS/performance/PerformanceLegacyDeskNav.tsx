import { PerformanceWorkspaceNav } from "@/components/performance/PerformanceWorkspaceNav";
import type { PerformanceWorkspaceId } from "@/incentives/lib/performanceWorkspaceNav";

/** Sub-nav for legacy desk pages that do not use PerformanceHubHeader. */
export function PerformanceLegacyDeskNav({ workspace }: { workspace: PerformanceWorkspaceId }) {
  return <PerformanceWorkspaceNav workspace={workspace} className="mb-2" />;
}
