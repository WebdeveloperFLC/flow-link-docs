import type { HrPerm, HrRole, HrScreenKey } from "./constants";
import { ALL_HR_SCREENS } from "./constants";
import type { HrPerms } from "./types";

const ALL_SCREENS_ON = Object.fromEntries(ALL_HR_SCREENS.map((s) => [s, true])) as Record<
  HrScreenKey,
  boolean
>;

/** Prototype defaultAccess — used when DB permissions unavailable (bootstrap / demo). */
export const DEFAULT_ACCESS_BY_ROLE: Record<
  HrRole,
  { perms: HrPerms; screens: Record<HrScreenKey, boolean> }
> = {
  "Super Admin": {
    perms: {
      view: true,
      apply: true,
      approve: true,
      override: true,
      export: true,
      configure: true,
      manageEmp: true,
    },
    screens: { ...ALL_SCREENS_ON },
  },
  Admin: {
    perms: {
      view: true,
      apply: true,
      approve: true,
      override: true,
      export: true,
      configure: true,
      manageEmp: true,
    },
    screens: { ...ALL_SCREENS_ON },
  },
  "HR Manager": {
    perms: {
      view: true,
      apply: true,
      approve: true,
      override: true,
      export: true,
      configure: false,
      manageEmp: true,
    },
    screens: {
      ...ALL_SCREENS_ON,
      config: false,
    },
  },
  "HR Executive": {
    perms: {
      view: true,
      apply: true,
      approve: true,
      override: false,
      export: true,
      configure: false,
      manageEmp: true,
    },
    screens: {
      ...ALL_SCREENS_ON,
      shifts: false,
      config: false,
      roles: false,
    },
  },
  Manager: {
    perms: {
      view: true,
      apply: true,
      approve: true,
      override: false,
      export: false,
      configure: false,
      manageEmp: false,
    },
    screens: {
      dashboard: true,
      ess: true,
      emp360: true,
      employees: false,
      documents: false,
      training: true,
      attendance: true,
      leave: true,
      compoff: true,
      late: true,
      mispunch: true,
      holiday: false,
      payrollCycle: false,
      calculator: false,
      verify: false,
      salaryRegister: false,
      payrollHistory: false,
      approvals: true,
      reports: false,
      config: false,
      docTypes: false,
      shifts: false,
      roles: false,
      audit: false,
      admin: false,
      masterData: false,
      wpms: false,
    },
  },
  Employee: {
    perms: {
      view: true,
      apply: true,
      approve: false,
      override: false,
      export: false,
      configure: false,
      manageEmp: false,
    },
    screens: {
      dashboard: false,
      ess: true,
      emp360: false,
      employees: false,
      documents: false,
      training: false,
      attendance: false,
      leave: true,
      compoff: true,
      late: true,
      mispunch: true,
      holiday: true,
      payrollCycle: false,
      calculator: false,
      verify: false,
      salaryRegister: false,
      payrollHistory: false,
      approvals: false,
      reports: false,
      config: false,
      docTypes: false,
      shifts: false,
      roles: false,
      audit: false,
      admin: false,
      masterData: false,
      wpms: false,
    },
  },
};

export function defaultPermsForRole(role: HrRole): HrPerms {
  return DEFAULT_ACCESS_BY_ROLE[role]?.perms ?? DEFAULT_ACCESS_BY_ROLE["HR Manager"].perms;
}

export function defaultScreensForRole(role: HrRole): Record<HrScreenKey, boolean> {
  return DEFAULT_ACCESS_BY_ROLE[role]?.screens ?? DEFAULT_ACCESS_BY_ROLE["HR Manager"].screens;
}
