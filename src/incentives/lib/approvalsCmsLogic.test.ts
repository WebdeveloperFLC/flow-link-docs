import { describe, expect, it } from "vitest";
import { approvalsCmsKpis } from "./approvalsCmsLogic";
import type { UnifiedApprovalItem } from "./approvalQueueLogic";

const sample: UnifiedApprovalItem[] = [
  {
    id: "1",
    shortId: "AP-0001",
    kind: "discount",
    itemLabel: "Discount 15%",
    amount: 18000,
    currency: "INR",
    requesterName: "Priya",
    requesterInitials: "PM",
    stage: "manager",
    stageLabel: "Manager approval",
    risk: "med",
    ageLabel: "2d",
    createdAt: "2026-06-10T08:00:00Z",
  },
  {
    id: "2",
    shortId: "AP-0002",
    kind: "discount",
    itemLabel: "Waiver",
    amount: 50000,
    currency: "INR",
    requesterName: "Raj",
    requesterInitials: "RS",
    stage: "director",
    stageLabel: "Director approval",
    risk: "high",
    ageLabel: "5d",
    createdAt: "2026-06-07T08:00:00Z",
  },
];

describe("approvalsCmsLogic", () => {
  it("builds KPI strip metrics from queue", () => {
    const kpis = approvalsCmsKpis(sample);
    expect(kpis.totalPending).toBe(2);
    expect(kpis.highRisk).toBe(1);
    expect(kpis.managerQueue).toBe(1);
    expect(kpis.oldestAge).toBe("2d");
  });

  it("returns empty-state KPIs", () => {
    expect(approvalsCmsKpis([])).toEqual({
      totalPending: 0,
      highRisk: 0,
      managerQueue: 0,
      oldestAge: "—",
    });
  });
});
