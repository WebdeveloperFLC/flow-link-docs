import { describe, expect, it } from "vitest";
import {
  canShowViewAsSwitcher,
  canUseFullPreviewCatalog,
  effectiveRolesForView,
  isPlatformOwner,
  viewAsFullAccessLabel,
  viewAsOptionsForUser,
  viewAsRoleLabel,
} from "./roleViewAs";

describe("roleViewAs", () => {
  it("keeps Administrator as a previewable team role (admin)", () => {
    expect(viewAsRoleLabel("admin")).toBe("Administrator");
    expect(viewAsRoleLabel("counselor")).toBe("Edit - Counselor");
  });

  it("owner default label is not Administrator", () => {
    expect(viewAsFullAccessLabel(true, ["administrator", "counselor", "viewer"])).toBe(
      "Owner (full access)",
    );
    expect(viewAsFullAccessLabel(false, ["admin", "commission_admin"])).toBe("All my roles");
  });

  it("platform owner vs team administrator", () => {
    expect(isPlatformOwner(["admin"], null)).toBe(false);
    expect(isPlatformOwner(["administrator"], null)).toBe(false);
    expect(isPlatformOwner(["administrator", "counselor", "viewer"], null)).toBe(true);
    expect(isPlatformOwner(["counselor"], "SUPER_ADMIN")).toBe(true);
  });

  it("full catalog only for owner not team admin", () => {
    expect(canUseFullPreviewCatalog(["admin"], null)).toBe(false);
    expect(canUseFullPreviewCatalog(["administrator", "counselor", "viewer"], null)).toBe(true);
  });

  it("narrows effective roles when previewing team Administrator", () => {
    expect(
      effectiveRolesForView(["administrator", "counselor", "viewer"], "admin"),
    ).toEqual(["admin"]);
  });

  it("shows switcher for multi-role staff or owner", () => {
    expect(canShowViewAsSwitcher(["admin"], false)).toBe(false);
    expect(canShowViewAsSwitcher(["admin", "commission_admin"], false)).toBe(true);
    expect(canShowViewAsSwitcher(["counselor"], true)).toBe(true);
  });

  it("owner gets full catalog; team admin gets assigned roles only", () => {
    expect(viewAsOptionsForUser(["admin"], false, [])).toEqual(["admin"]);
    expect(viewAsOptionsForUser(["administrator", "counselor", "viewer"], true, ["counselor"])).toEqual([
      "counselor",
    ]);
  });
});
