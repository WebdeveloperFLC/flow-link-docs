import { describe, expect, it } from "vitest";
import {
  auditActionCounts,
  auditTrailCmsKpis,
  mapDiscountApprovalAuditRows,
  mergeAuditEvents,
} from "./auditTrailCmsLogic";

describe("auditTrailCmsLogic", () => {
  it("maps discount approval create + approve events", () => {
    const events = mapDiscountApprovalAuditRows([
      {
        id: "d1",
        discount_amount: 15000,
        discount_percent: 15,
        status: "approved",
        created_at: "2026-06-10T08:00:00Z",
        reviewed_at: "2026-06-10T10:00:00Z",
        review_note: "Within policy",
        counselor: { full_name: "Priya Mehta" },
        reviewer: { full_name: "Branch Manager" },
        client: { full_name: "PH Demo Client" },
      },
    ]);
    expect(events).toHaveLength(2);
    expect(events[0].action).toBe("create");
    expect(events[1].action).toBe("approve");
  });

  it("merges and sorts newest first", () => {
    const merged = mergeAuditEvents(
      [
        {
          id: "a",
          sourceId: "1",
          sourceModule: "wallet",
          action: "consume",
          actionLabel: "Consumed",
          actorName: "System",
          objectLabel: "Wallet",
          meta: "test",
          occurredAt: "2026-06-09T08:00:00Z",
          timeLabel: "1d",
        },
      ],
      [
        {
          id: "b",
          sourceId: "2",
          sourceModule: "approvals",
          action: "create",
          actionLabel: "Created",
          actorName: "Priya",
          objectLabel: "Discount",
          meta: "test",
          occurredAt: "2026-06-10T08:00:00Z",
          timeLabel: "now",
        },
      ],
    );
    expect(merged[0].id).toBe("b");
  });

  it("builds KPI and action counts", () => {
    const items = mapDiscountApprovalAuditRows([
      {
        id: "d1",
        discount_amount: 5000,
        discount_percent: 5,
        status: "declined",
        created_at: "2026-06-10T08:00:00Z",
        reviewed_at: "2026-06-10T09:00:00Z",
        review_note: null,
        counselor: { full_name: "A" },
        reviewer: { full_name: "B" },
        client: { full_name: "C" },
      },
    ]);
    const kpis = auditTrailCmsKpis(items);
    expect(kpis.totalEvents).toBe(2);
    expect(kpis.rejected).toBe(1);
    expect(auditActionCounts(items).some((c) => c.action === "reject")).toBe(true);
  });
});
