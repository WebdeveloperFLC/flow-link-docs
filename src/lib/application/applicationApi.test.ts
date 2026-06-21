import { describe, expect, it } from "vitest";
import { buildTransitionQualificationRpcParams } from "./applicationApi";

describe("buildTransitionQualificationRpcParams", () => {
  it("sends null hold reason for terminal transitions (not ON_HOLD)", () => {
    const params = buildTransitionQualificationRpcParams({
      applicationId: "app-1",
      toStatus: "REFUSED",
      reasonCode: "INSTITUTION_DECLINED",
      reasonNotes: "Offer declined by student",
      holdReasonCode: "" as never,
    });

    expect(params.p_hold_reason_code).toBeNull();
    expect(params.p_reason_code).toBe("INSTITUTION_DECLINED");
    expect(params.p_to_status).toBe("REFUSED");
  });

  it("preserves hold reason for ON_HOLD transitions", () => {
    const params = buildTransitionQualificationRpcParams({
      applicationId: "app-1",
      toStatus: "ON_HOLD",
      holdReasonCode: "WAITING_VISA_RESULT",
    });

    expect(params.p_hold_reason_code).toBe("WAITING_VISA_RESULT");
  });
});
