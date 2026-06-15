import { describe, expect, it } from "vitest";
import {
  canShowViewAsSwitcher,
  effectiveRolesForView,
  isSuperRoleViewer,
  viewAsOptionsForUser,
} from "./roleViewAs";

describe("roleViewAs", () => {
  it("narrows effective roles when view-as is set", () => {
    expect(effectiveRolesForView(["admin", "counselor"], "counselor")).toEqual(["counselor"]);
    expect(effectiveRolesForView(["admin", "counselor"], null)).toEqual(["admin", "counselor"]);
  });

  it("detects super viewers", () => {
    expect(isSuperRoleViewer(["counselor"], false)).toBe(false);
    expect(isSuperRoleViewer(["admin"], false)).toBe(true);
    expect(isSuperRoleViewer([], true)).toBe(true);
  });

  it("shows switcher for multi-role or super admin", () => {
    expect(canShowViewAsSwitcher(["counselor"], false)).toBe(false);
    expect(canShowViewAsSwitcher(["counselor", "manager"], false)).toBe(true);
    expect(canShowViewAsSwitcher(["counselor"], true)).toBe(true);
  });

  it("limits options to assigned roles unless super viewer", () => {
    expect(viewAsOptionsForUser(["counselor", "manager"], false, [])).toEqual(["manager", "counselor"]);
    expect(viewAsOptionsForUser(["admin"], true, ["counselor", "director"])).toEqual([
      "counselor",
      "director",
    ]);
  });
});
