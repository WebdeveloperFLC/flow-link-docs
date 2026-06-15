import type { HrPerm, HrRole, HrScreenKey } from "./constants";
import { ALL_HR_SCREENS } from "./constants";
import type { HrPerms } from "./types";

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
    screens: Object.fromEntries(ALL_HR_SCREENS.map((s) => [s, true])) as Record<HrScreenKey, boolean>,
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
    screens: Object.fromEntries(ALL_HR_SCREENS.map((s) => [s, true])) as Record<HrScreenKey, boolean>,
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
      dashboard: true,
      ess: true,
      emp360: true,
      employees: true,
      docTypes: true,
      shifts: true,
      training: true,
      calculator: true,
      verify: true,
      attendance: true,
      leave: true,
      compoff: true,
      late: true,
      mispunch: true,
      holiday: true,
      config: false,
      roles: true,
      audit: true,
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
      dashboard: true,
      ess: true,
      emp360: true,
      employees: true,
      docTypes: true,
      shifts: false,
      training: true,
      calculator: true,
      verify: true,
      attendance: true,
      leave: true,
      compoff: true,
      late: true,
      mispunch: true,
      holiday: true,
      config: false,
      roles: false,
      audit: true,
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
      docTypes: false,
      shifts: false,
      training: true,
      calculator: false,
      verify: false,
      attendance: true,
      leave: true,
      compoff: true,
      late: true,
      mispunch: true,
      holiday: false,
      config: false,
      roles: false,
      audit: false,
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
      docTypes: false,
      shifts: false,
      training: false,
      calculator: false,
      verify: false,
      attendance: false,
      leave: true,
      compoff: true,
      late: true,
      mispunch: true,
      holiday: true,
      config: false,
      roles: false,
      audit: false,
    },
  },
};

export function defaultPermsForRole(role: HrRole): HrPerms {
  return DEFAULT_ACCESS_BY_ROLE[role]?.perms ?? DEFAULT_ACCESS_BY_ROLE["HR Manager"].perms;
}

export function defaultScreensForRole(role: HrRole): Record<HrScreenKey, boolean> {
  return DEFAULT_ACCESS_BY_ROLE[role]?.screens ?? DEFAULT_ACCESS_BY_ROLE["HR Manager"].screens;
}
