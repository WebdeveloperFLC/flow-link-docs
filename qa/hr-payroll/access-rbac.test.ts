import { describe, expect, it } from "vitest";
import { DEFAULT_ACCESS_BY_ROLE } from "@/hr-payroll/lib/defaultAccess";
import type { HrRole } from "@/hr-payroll/lib/constants";

describe("HR Payroll RBAC matrix", () => {
  const employee = DEFAULT_ACCESS_BY_ROLE.Employee;
  const admin = DEFAULT_ACCESS_BY_ROLE.Admin;

  it("Employee cannot configure or export payroll register", () => {
    expect(employee.perms.configure).toBe(false);
    expect(employee.perms.export).toBe(false);
    expect(employee.screens.verify).toBe(false);
    expect(employee.screens.employees).toBe(false);
  });

  it("Employee can use ESS and apply leave/comp-off", () => {
    expect(employee.screens.ess).toBe(true);
    expect(employee.perms.apply).toBe(true);
    expect(employee.screens.leave).toBe(true);
  });

  it("Admin has full module access", () => {
    expect(admin.perms.configure).toBe(true);
    expect(admin.perms.manageEmp).toBe(true);
    expect(admin.screens.verify).toBe(true);
  });

  it("Manager cannot access payroll verify or config", () => {
    const m = DEFAULT_ACCESS_BY_ROLE.Manager;
    expect(m.screens.verify).toBe(false);
    expect(m.screens.config).toBe(false);
    expect(m.perms.approve).toBe(true);
  });

  it("only Admin and Super Admin have configure on all screens", () => {
    const withConfig: HrRole[] = ["Super Admin", "Admin"];
    for (const role of withConfig) {
      expect(DEFAULT_ACCESS_BY_ROLE[role].perms.configure).toBe(true);
    }
    expect(DEFAULT_ACCESS_BY_ROLE["HR Manager"].perms.configure).toBe(false);
  });
});
