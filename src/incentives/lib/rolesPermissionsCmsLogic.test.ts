import { describe, expect, it } from "vitest";
import {
  CMS_PERMISSION_MATRIX,
  capabilityMeta,
  mapAuthRolesToCmsRole,
  matrixRow,
  rolesPermissionsKpis,
} from "./rolesPermissionsCmsLogic";

describe("rolesPermissionsCmsLogic", () => {
  it("has 8 roles and 11 modules", () => {
    const kpis = rolesPermissionsKpis();
    expect(kpis.roles).toBe(8);
    expect(kpis.modules).toBe(11);
    expect(matrixRow("super")).toHaveLength(11);
  });

  it("maps auth roles to CMS perspective", () => {
    expect(mapAuthRolesToCmsRole(["manager"], false)).toBe("branch");
    expect(mapAuthRolesToCmsRole(["admin"], true)).toBe("admin");
    expect(mapAuthRolesToCmsRole(["director"], false)).toBe("regional");
  });

  it("labels capabilities", () => {
    expect(capabilityMeta("F").label).toBe("Full");
    expect(CMS_PERMISSION_MATRIX.counselor[2]).toBe("C");
  });
});
