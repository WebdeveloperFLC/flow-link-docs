import { describe, expect, it } from "vitest";
import {
  resolveClientDetailTab,
  shouldOpenAssessmentFromTab,
} from "@/components/clients/ClientDetailTabNav";

describe("resolveClientDetailTab", () => {
  it("maps removed tabs to profile or overview", () => {
    expect(resolveClientDetailTab("family")).toBe("team");
    expect(resolveClientDetailTab("services")).toBe("client-services");
    expect(resolveClientDetailTab("programs")).toBe("client-services");
    expect(resolveClientDetailTab("setup")).toBe("overview");
    expect(resolveClientDetailTab("staging")).toBe("overview");
  });

  it("maps legacy qualification tab to applications", () => {
    expect(resolveClientDetailTab("qualification")).toBe("applications");
  });

  it("keeps current tabs", () => {
    expect(resolveClientDetailTab("applications")).toBe("applications");
    expect(resolveClientDetailTab("profile")).toBe("profile");
    expect(resolveClientDetailTab("documents")).toBe("documents");
  });

  it("defaults unknown to overview", () => {
    expect(resolveClientDetailTab("nope")).toBe("overview");
    expect(resolveClientDetailTab(null)).toBe("overview");
  });
});

describe("shouldOpenAssessmentFromTab", () => {
  it("does not auto-open assessment from applications tab", () => {
    expect(shouldOpenAssessmentFromTab("applications")).toBe(false);
    expect(shouldOpenAssessmentFromTab("qualification")).toBe(false);
    expect(shouldOpenAssessmentFromTab("profile")).toBe(false);
  });
});
