import { describe, expect, it } from "vitest";
import { canUserApproveJournal } from "@/platform/ewe/sodEngine";
import { businessStatusFromLegacyPaymentStatus } from "@/platform/types/statuses";

describe("Phase B — journal approval SoD", () => {
  it("blocks verifier from approving journal when they verified payment", () => {
    const r = canUserApproveJournal({
      actorUserId: "user-a",
      verifiedByUserId: "user-a",
      postedByUserId: "user-b",
    });
    expect(r.allowed).toBe(false);
  });

  it("allows different user to approve journal", () => {
    const r = canUserApproveJournal({
      actorUserId: "user-c",
      verifiedByUserId: "user-a",
      postedByUserId: "user-b",
    });
    expect(r.allowed).toBe(true);
  });
});

describe("Phase B — status resolver fallback", () => {
  it("maps cash awaiting to pending cash verification business status", () => {
    expect(businessStatusFromLegacyPaymentStatus("awaiting_verification", "cash")).toBe(
      "pending_cash_verification",
    );
  });
});
