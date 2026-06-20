import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildProfileViewModelFromSources } from "@/lib/profile/normalizeProfile";
import { toEditState } from "@/lib/profile/toEditState";

/**
 * CRM-R-011 — Intended intake editable in Unified Edit Profile and synced to Overview.
 */
describe("CRM-R-011 intended intake in edit profile", () => {
  it("loads clients.intake into ProfileIdentity on normalize", () => {
    const vm = buildProfileViewModelFromSources({
      client: { id: "c1", full_name: "Test User", intake: "Jan 2027" },
      profile: {},
    });
    expect(vm.identity.intake).toBe("Jan 2027");
  });

  it("toEditState preserves intake for edit form initial value", () => {
    const vm = buildProfileViewModelFromSources({
      client: { id: "c1", full_name: "Test User", intake: "Mar 2026" },
      profile: {},
    });
    const edit = toEditState(vm);
    expect(edit.identity.intake).toBe("Mar 2026");
  });

  it("ProfileIdentityPanel exposes Intended intake with registration placeholder", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/profile/ProfileIdentityContactPanels.tsx"),
      "utf8",
    );
    expect(src).toContain('"Intended intake"');
    expect(src).toContain("e.g. Sep 2026");
    expect(src).toContain('"intake"');
  });

  it("profileSave writes clients.intake from identity section", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/lib/profile/profileSave.ts"),
      "utf8",
    );
    expect(src).toContain("clientPatch.intake = state.identity.intake");
  });

  it("ClientDetail syncs Overview applicant profile after profile save", () => {
    const src = readFileSync(resolve(process.cwd(), "src/pages/ClientDetail.tsx"), "utf8");
    expect(src).toContain("onProfileSaved");
    expect(src).toContain("intake: vm.identity.intake");
  });

  it("does not duplicate intake on client_profile table patch keys", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/lib/profile/profileSave.ts"),
      "utf8",
    );
    const keysBlock = src.slice(
      src.indexOf("const IDENTITY_PROFILE_KEYS"),
      src.indexOf("const CONTACT_PROFILE_KEYS"),
    );
    expect(keysBlock).not.toContain('"intake"');
  });
});
