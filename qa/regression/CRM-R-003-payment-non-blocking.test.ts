import { describe, expect, it } from "vitest";
import {
  isServiceRemovalRestricted,
  PAYMENT_NEVER_BLOCKS_PROCESS,
} from "@/lib/clientProcessPolicy";
import { isActiveApplicationInProgress } from "@/lib/clientServiceGuards";

/**
 * CRM-R-003 — Outstanding payment / pipeline progress must not block service edits or CRM process.
 */
describe("CRM-R-003 payment never blocks process", () => {
  it("policy flag is enabled", () => {
    expect(PAYMENT_NEVER_BLOCKS_PROCESS).toBe(true);
  });

  it("service removal is never restricted", () => {
    expect(
      isServiceRemovalRestricted({
        pipeline_id: "pipe-1",
        stage_order: 5,
        progress_percent: 40,
        stage_key: "payment_pending",
      }),
    ).toBe(false);
  });

  it("legacy isActiveApplicationInProgress always false (no pipeline lock)", () => {
    expect(
      isActiveApplicationInProgress({
        pipeline_id: "pipe-1",
        stage_order: 10,
        progress_percent: 80,
        stage_key: "visa_submitted",
      }),
    ).toBe(false);
  });
});
