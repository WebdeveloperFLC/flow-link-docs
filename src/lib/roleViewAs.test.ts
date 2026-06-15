import { describe, expect, it } from "vitest";
import {
  canPreviewAllRoles,
  canShowViewAsSwitcher,
  effectiveRolesForView,
  viewAsOptionsForUser,
  viewAsRoleLabel,
} from "./roleViewAs";

describe("roleViewAs", () => {
  it("uses Team & roles labels (no Super admin)", () => {
    expect(viewAsRoleLabel("admin")).toBe("Administrator");
    expect(viewAsRoleLabel("counselor")).toBe("Edit - Counselor");
    expect(viewAsRoleLabel("commission_admin")).toBe("Commission admin");
  });

  it("narrows effective roles when view-as is set", () => {
    expect(effectiveRolesForView(["admin", "counselor"], "counselor")).toEqual(["counselor"]);
    expect(effectiveRolesForView(["admin", "counselor"], null)).toEqual(["admin", "counselor"]);
  });

  it("detects administrators who can preview all roles", () => {
    expect(canPreviewAllRoles(["counselor"], false)).toBe(false);
    expect(canPreviewAllRoles(["admin"], false)).toBe(true);
    expect(canPreviewAllRoles(["administrator"], false)).toBe(true);
    expect(canPreviewAllRoles([], true)).toBe(true);
  });

  it("shows switcher for multi-role or administrator", () => {
    expect(canShowViewAsSwitcher(["counselor"], false)).toBe(false);
    expect(canShowViewAsSwitcher(["counselor", "manager"], false)).toBe(true);
    expect(canShowViewAsSwitcher(["counselor"], true)).toBe(true);
  });

  it("limits options to assigned roles unless administrator preview", () => {
    expect(viewAsOptionsForUser(["counselor", "manager"], false, [])).toEqual(["manager", "counselor"]);
    expect(viewAsOptionsForUser(["admin"], true, ["counselor", "director"])).toEqual([
      "counselor",
      "director",
    ]);
  });
});
