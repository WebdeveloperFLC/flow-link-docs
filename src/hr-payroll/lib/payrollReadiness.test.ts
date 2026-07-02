import { describe, it, expect } from "vitest";
import { buildPayrollReadiness, type ReadinessItem } from "./payrollReadiness";

const byKey = (items: ReadinessItem[], key: string) => items.find((i) => i.key === key)!;

const cleanInput = {
  lineCount: 10,
  overriddenCount: 0,
  errorCount: 0,
  warningCount: 0,
  bankTotal: 10,
  bankMissing: 0,
  pendingAttendance: 0,
  pendingLeave: 0,
};

describe("buildPayrollReadiness", () => {
  it("returns the seven expected checklist items in order", () => {
    const items = buildPayrollReadiness(cleanInput);
    expect(items.map((i) => i.key)).toEqual([
      "attendance",
      "leave",
      "validation",
      "bank",
      "register",
      "overrides",
      "warnings",
    ]);
  });

  it("all-clean cycle reports every gating item ok", () => {
    const items = buildPayrollReadiness(cleanInput);
    expect(byKey(items, "attendance").state).toBe("ok");
    expect(byKey(items, "leave").state).toBe("ok");
    expect(byKey(items, "validation").state).toBe("ok");
    expect(byKey(items, "bank").state).toBe("ok");
    expect(byKey(items, "register").state).toBe("ok");
  });

  it("flags pending attendance and leave approvals as warnings with counts", () => {
    const items = buildPayrollReadiness({ ...cleanInput, pendingAttendance: 3, pendingLeave: 2 });
    expect(byKey(items, "attendance").state).toBe("warn");
    expect(byKey(items, "attendance").detail).toContain("3");
    expect(byKey(items, "leave").state).toBe("warn");
    expect(byKey(items, "leave").detail).toContain("2");
  });

  it("validation is error when errors exist, warn when only warnings", () => {
    expect(byKey(buildPayrollReadiness({ ...cleanInput, errorCount: 1 }), "validation").state).toBe("error");
    expect(byKey(buildPayrollReadiness({ ...cleanInput, warningCount: 4 }), "validation").state).toBe("warn");
  });

  it("bank details: info when nothing to check, warn when some missing", () => {
    expect(byKey(buildPayrollReadiness({ ...cleanInput, bankTotal: 0 }), "bank").state).toBe("info");
    const missing = byKey(buildPayrollReadiness({ ...cleanInput, bankMissing: 2 }), "bank");
    expect(missing.state).toBe("warn");
    expect(missing.detail).toContain("2 of 10");
  });

  it("register warns when no payroll lines exist", () => {
    expect(byKey(buildPayrollReadiness({ ...cleanInput, lineCount: 0 }), "register").state).toBe("warn");
  });

  it("overrides and warnings surface their counts", () => {
    const items = buildPayrollReadiness({ ...cleanInput, overriddenCount: 5, warningCount: 3 });
    expect(byKey(items, "overrides").detail).toContain("5");
    expect(byKey(items, "warnings").state).toBe("warn");
    expect(byKey(items, "warnings").detail).toContain("3");
  });
});
