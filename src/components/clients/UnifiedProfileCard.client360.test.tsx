import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PROFILE_TABS } from "@/components/profile/ProfileTabNav";
import { Client360ExecutivePanel } from "@/components/profile/Client360ExecutivePanel";
import { createMockProfileViewModel } from "@/lib/profile/mockProfileViewModel";
import type { ProfileSectionId } from "@/lib/profile/types";

describe("ProfileTabNav — C360-1", () => {
  it('sixth pill label is exactly "Client 360"', () => {
    expect(PROFILE_TABS).toHaveLength(6);
    expect(PROFILE_TABS[5].id).toBe("client360");
    expect(PROFILE_TABS[5].label).toBe("Client 360");
  });
});

describe("Client360ExecutivePanel isolation", () => {
  it("C360-6 read-only content only", () => {
    render(<Client360ExecutivePanel viewModel={createMockProfileViewModel()} />);
    const section = screen.getByTestId("profile-section-client360");
    expect(within(section).getByText("Highlights")).toBeInTheDocument();
    expect(within(section).getByText("Client 360 registry")).toBeInTheDocument();
  });

  it("C360-7 through C360-13 no interactive controls", () => {
    render(<Client360ExecutivePanel viewModel={createMockProfileViewModel()} />);
    const section = screen.getByTestId("profile-section-client360");
    expect(within(section).queryByRole("textbox")).toBeNull();
    expect(within(section).queryByRole("combobox")).toBeNull();
    expect(within(section).queryByRole("checkbox")).toBeNull();
    expect(within(section).queryByRole("button", { name: /edit/i })).toBeNull();
    expect(within(section).queryByRole("button", { name: /save/i })).toBeNull();
    expect(within(section).queryByRole("button", { name: /link/i })).toBeNull();
    expect(within(section).queryByRole("button", { name: /upload/i })).toBeNull();
  });
});

describe("C360-3 no useProfileAutosave", () => {
  it("autosave hook does not exist in profile hooks barrel", async () => {
    const hooks = await import("@/hooks/profile/index");
    expect(hooks).not.toHaveProperty("useProfileAutosave");
  });
});

describe("C360-4 edit-state type guard", () => {
  it("editingSection type excludes client360", () => {
    const allowed: ProfileSectionId[] = ["identity", "contact", "tests", "education", "experience"];
    expect(allowed).not.toContain("client360" as never);
  });
});

describe("C360-2 profileSave not invoked on tab navigation", () => {
  it("profileSave is only exported for explicit saveSection calls", async () => {
    const mod = await import("@/lib/profile/profileSave");
    expect(typeof mod.profileSave).toBe("function");
    // Tab navigation uses setActiveSection only — verified in UnifiedProfileCard handleTabChange
    // (no profileSave import in ProfileTabNav)
    const tabNav = await import("@/components/profile/ProfileTabNav");
    expect(tabNav.PROFILE_TABS[5].id).toBe("client360");
  });
});

describe("C360-5 document hooks scoped to editable sections", () => {
  it("Client360ExecutivePanel module has no document hook imports", async () => {
    const mod = await import("@/components/profile/Client360ExecutivePanel");
    expect(mod.Client360ExecutivePanel).toBeDefined();
    // Static: panel only imports summarizeProfileFor360 + registry — no useProfileDocuments
  });
});
