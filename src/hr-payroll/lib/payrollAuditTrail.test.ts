import { describe, it, expect } from "vitest";
import { filterCyclePayrollAudit } from "./payrollAuditTrail";
import type { AuditLogRow } from "./types";

function log(overrides: Partial<AuditLogRow>): AuditLogRow {
  return {
    id: Math.random().toString(36).slice(2),
    org_id: "o1",
    actor_label: "Asha",
    action: "Payroll Processed",
    target: "June 2026",
    prev_value: "Draft",
    new_value: "Processed",
    created_at: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("filterCyclePayrollAudit", () => {
  it("keeps only payroll actions for the given cycle, oldest first", () => {
    const logs = [
      log({ action: "Payroll Locked", created_at: "2026-06-03T10:00:00Z" }),
      log({ action: "Payroll Processed", created_at: "2026-06-01T10:00:00Z" }),
      log({ action: "Payroll Approved", created_at: "2026-06-02T10:00:00Z" }),
      log({ action: "Employee Updated", target: "June 2026", created_at: "2026-06-01T09:00:00Z" }),
      log({ action: "Payroll Processed", target: "May 2026", created_at: "2026-05-01T10:00:00Z" }),
    ];
    const trail = filterCyclePayrollAudit(logs, "June 2026");
    expect(trail.map((t) => t.action)).toEqual([
      "Payroll Processed",
      "Payroll Approved",
      "Payroll Locked",
    ]);
  });

  it("includes composite override targets for the cycle", () => {
    const logs = [
      log({ action: "Payroll Validation Overridden", target: "June 2026 · Lock payroll · 1 error(s), 0 warning(s)" }),
    ];
    expect(filterCyclePayrollAudit(logs, "June 2026")).toHaveLength(1);
  });

  it("does not match a different cycle whose label is unrelated", () => {
    const logs = [log({ target: "July 2026" })];
    expect(filterCyclePayrollAudit(logs, "June 2026")).toHaveLength(0);
  });

  it("returns empty for a blank cycle label", () => {
    expect(filterCyclePayrollAudit([log({})], "")).toHaveLength(0);
    expect(filterCyclePayrollAudit([log({})], "   ")).toHaveLength(0);
  });

  it("does not mutate the input array order", () => {
    const logs = [
      log({ action: "Payroll Locked", created_at: "2026-06-03T10:00:00Z" }),
      log({ action: "Payroll Processed", created_at: "2026-06-01T10:00:00Z" }),
    ];
    const snapshot = logs.map((l) => l.created_at);
    filterCyclePayrollAudit(logs, "June 2026");
    expect(logs.map((l) => l.created_at)).toEqual(snapshot);
  });
});
