import type { UnifiedApprovalItem } from "./approvalQueueLogic";

export interface ApprovalsCmsKpis {
  totalPending: number;
  highRisk: number;
  managerQueue: number;
  oldestAge: string;
}

export function approvalsCmsKpis(items: UnifiedApprovalItem[]): ApprovalsCmsKpis {
  if (!items.length) {
    return { totalPending: 0, highRisk: 0, managerQueue: 0, oldestAge: "—" };
  }
  return {
    totalPending: items.length,
    highRisk: items.filter((i) => i.risk === "high").length,
    managerQueue: items.filter((i) => i.stage === "manager").length,
    oldestAge: items[0]?.ageLabel ?? "—",
  };
}
