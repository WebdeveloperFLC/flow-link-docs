import { describe, expect, it } from "vitest";
import {
  resolveClientDetailTab,
  shouldOpenAssessmentFromTab,
} from "@/components/clients/ClientDetailTabNav";

describe("resolveClientDetailTab", () => {
  it("maps removed tabs to profile or overview", () => {
    expect(resolveClientDetailTab("family")).toBe("profile");
    expect(resolveClientDetailTab("services")).toBe("profile");
    expect(resolveClientDetailTab("qualification")).toBe("overview");
  });

  it("keeps current tabs", () => {
    expect(resolveClientDetailTab("profile")).toBe("profile");
    expect(resolveClientDetailTab("documents")).toBe("documents");
  });

  it("defaults unknown to overview", () => {
    expect(resolveClientDetailTab("nope")).toBe("overview");
    expect(resolveClientDetailTab(null)).toBe("overview");
  });
});

describe("shouldOpenAssessmentFromTab", () => {
  it("opens assessment dialog for legacy qualification tab", () => {
    expect(shouldOpenAssessmentFromTab("qualification")).toBe(true);
    expect(shouldOpenAssessmentFromTab("profile")).toBe(false);
  });
});
