import { describe, expect, it } from "vitest";
import {
  approvalShortId,
  buildApprovalQueue,
  discountApprovalRisk,
  formatApprovalAge,
} from "./approvalQueueLogic";

describe("approvalQueueLogic", () => {
  it("builds short ids", () => {
    expect(approvalShortId("a0020001-0001-4000-8000-000000000001")).toMatch(/^AP-/);
  });

  it("formats age labels", () => {
    const now = new Date("2026-06-14T10:00:00Z").getTime();
    expect(formatApprovalAge("2026-06-14T08:00:00Z", now)).toBe("2h");
  });

  it("maps discount risk", () => {
    expect(
      discountApprovalRisk({
        is_waiver: true,
        below_floor: false,
        discount_percent: 10,
        discount_amount: 1000,
      }),
    ).toBe("high");
  });

  it("builds unified queue sorted oldest first", () => {
    const queue = buildApprovalQueue(
      [
        {
          id: "1",
          discount_amount: 18000,
          discount_percent: 15,
          approval_level: "manager",
          below_floor: false,
          is_waiver: false,
          request_note: "PH Demo manager queue",
          created_at: "2026-06-13T08:00:00Z",
          counselor: { full_name: "Priya Mehta" },
          client: { full_name: "PH Demo Client" },
          offer: null,
        },
      ],
      [],
    );
    expect(queue).toHaveLength(1);
    expect(queue[0].stage).toBe("manager");
    expect(queue[0].requesterName).toBe("Priya Mehta");
  });
});
