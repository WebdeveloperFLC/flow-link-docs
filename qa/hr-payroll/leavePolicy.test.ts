import { describe, expect, it } from "vitest";
import {
  monthlyPaidLeaveUsed,
  resolveLeaveApplication,
  UNPAID_LEAVE_TYPE,
} from "@/hr-payroll/lib/leavePolicy";

describe("leavePolicy", () => {
  const balances = [
    {
      id: "1",
      org_id: "o",
      employee_id: "e1",
      policy_year: 2026,
      type: "Casual Leave",
      entitled: 18,
      accrued: 3,
      taken: 0,
    },
    {
      id: "2",
      org_id: "o",
      employee_id: "e1",
      policy_year: 2026,
      type: "Sick Leave",
      entitled: 8,
      accrued: 2,
      taken: 0,
    },
  ];

  it("counts monthly paid leave for same employee and month", () => {
    const requests = [
      {
        id: "a",
        employee_id: "e1",
        type: "Casual Leave",
        days: 1,
        from_date: "2026-06-10",
        status: "Approved",
      },
      {
        id: "b",
        employee_id: "e1",
        type: "Sick Leave",
        days: 0.5,
        from_date: "2026-06-20",
        status: "Pending",
      },
      {
        id: "c",
        employee_id: "e2",
        type: "Casual Leave",
        days: 1,
        from_date: "2026-06-12",
        status: "Approved",
      },
    ];
    expect(monthlyPaidLeaveUsed(requests, "e1", "2026-06-15")).toBe(1.5);
  });

  it("forces unpaid when monthly cap exceeded", () => {
    const requests = [
      {
        id: "a",
        employee_id: "e1",
        type: "Casual Leave",
        days: 1.5,
        from_date: "2026-06-05",
        status: "Approved",
      },
    ];
    const r = resolveLeaveApplication({
      preferredType: "Sick Leave",
      days: 0.5,
      employeeId: "e1",
      fromDate: "2026-06-10",
      balances,
      requests,
    });
    expect(r.effectiveType).toBe(UNPAID_LEAVE_TYPE);
    expect(r.forcedUnpaid).toBe(true);
  });

  it("forces unpaid when balance insufficient", () => {
    const r = resolveLeaveApplication({
      preferredType: "Casual Leave",
      days: 5,
      employeeId: "e1",
      fromDate: "2026-06-10",
      balances,
      requests: [],
    });
    expect(r.effectiveType).toBe(UNPAID_LEAVE_TYPE);
    expect(r.forcedUnpaid).toBe(true);
  });

  it("allows paid leave when balance and monthly cap ok", () => {
    const r = resolveLeaveApplication({
      preferredType: "Casual Leave",
      days: 1,
      employeeId: "e1",
      fromDate: "2026-06-10",
      balances,
      requests: [],
    });
    expect(r.effectiveType).toBe("Casual Leave");
    expect(r.forcedUnpaid).toBe(false);
  });
});
