import { describe, expect, it } from "vitest";
import {
  defaultTabForGroup,
  legacyClientTabRedirectMessage,
  resolveClientDetailGroup,
  resolveClientDetailTab,
  tabBelongsToGroup,
} from "./ClientDetailTabNav";

describe("resolveClientDetailTab", () => {
  it("maps legacy tabs", () => {
    expect(resolveClientDetailTab("family")).toBe("team");
    expect(resolveClientDetailTab("services")).toBe("client-services");
    expect(resolveClientDetailTab("programs")).toBe("client-services");
    expect(resolveClientDetailTab("setup")).toBe("overview");
    expect(resolveClientDetailTab("staging")).toBe("overview");
  });

  it("maps legacy qualification tab to applications", () => {
    expect(resolveClientDetailTab("qualification")).toBe("applications");
  });

  it("passes through current tabs", () => {
    expect(resolveClientDetailTab("applications")).toBe("applications");
    expect(resolveClientDetailTab("profile")).toBe("profile");
    expect(resolveClientDetailTab("documents")).toBe("documents");
  });

  it("defaults unknown values to overview", () => {
    expect(resolveClientDetailTab("nope")).toBe("overview");
    expect(resolveClientDetailTab(null)).toBe("overview");
  });
});

describe("client detail groups", () => {
  it("resolves group from tab", () => {
    expect(resolveClientDetailGroup("profile")).toBe("case");
    expect(resolveClientDetailGroup("documents")).toBe("documents");
    expect(tabBelongsToGroup("tasks", "work")).toBe(true);
  });

  it("returns default tab per group", () => {
    expect(defaultTabForGroup("case")).toBe("profile");
    expect(defaultTabForGroup("work")).toBe("communications");
  });
});

describe("legacyClientTabRedirectMessage", () => {
  it("returns a human-readable redirect message", () => {
    expect(legacyClientTabRedirectMessage("family", "team")).toBe(
      "'Family' is now under 'Team & Access'.",
    );
    expect(legacyClientTabRedirectMessage("services", "client-services")).toBe(
      "'Services' is now under 'Client Services'.",
    );
  });

  it("returns null when tab is unchanged", () => {
    expect(legacyClientTabRedirectMessage("overview", "overview")).toBeNull();
  });
});
