import { describe, expect, it } from "vitest";
import { patchRowsPgwpStatus, pgwpBulkValueToField } from "./bulkStagingUpdate";
import type { UpiCourseStaging } from "../types/upi";

const baseRow = { id: "a", is_pgwp_eligible: null } as UpiCourseStaging;

describe("pgwpBulkValueToField", () => {
  it("maps eligible to true", () => {
    expect(pgwpBulkValueToField("eligible")).toBe(true);
  });

  it("maps not_eligible to false", () => {
    expect(pgwpBulkValueToField("not_eligible")).toBe(false);
  });

  it("maps unknown to null", () => {
    expect(pgwpBulkValueToField("unknown")).toBe(null);
  });
});

describe("patchRowsPgwpStatus", () => {
  it("updates only selected rows", () => {
    const rows = [
      { ...baseRow, id: "a" },
      { ...baseRow, id: "b", is_pgwp_eligible: false },
      { ...baseRow, id: "c" },
    ] as UpiCourseStaging[];

    const next = patchRowsPgwpStatus(rows, ["a", "c"], "eligible");
    expect(next[0].is_pgwp_eligible).toBe(true);
    expect(next[1].is_pgwp_eligible).toBe(false);
    expect(next[2].is_pgwp_eligible).toBe(true);
  });
});
