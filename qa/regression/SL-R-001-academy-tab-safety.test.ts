import { describe, expect, it } from "vitest";
import { defaultAcademyTab, resolveAcademyTabs } from "@/lib/service-library/academyTabs";
import type { AcademyViewModel } from "@/lib/service-library/buildAcademyViewModel";

/** Minimal view stub — switching service category must not leave an invalid tab id. */
function coachingView(): Pick<
  AcademyViewModel,
  "isCoaching" | "isMbbs" | "coachingProfile" | "feeBreakdown" | "countryInsights" | "mbbsMeta"
> {
  return {
    isCoaching: true,
    isMbbs: false,
    coachingProfile: "program",
    feeBreakdown: null,
    countryInsights: null,
    mbbsMeta: null,
  };
}

function visaViewNoFees(): Pick<
  AcademyViewModel,
  "isCoaching" | "isMbbs" | "coachingProfile" | "feeBreakdown" | "countryInsights" | "mbbsMeta"
> {
  return {
    isCoaching: false,
    isMbbs: false,
    coachingProfile: null,
    feeBreakdown: null,
    countryInsights: null,
    mbbsMeta: null,
  };
}

function resolveSafeTab(
  view: Pick<
    AcademyViewModel,
    "isCoaching" | "isMbbs" | "coachingProfile" | "feeBreakdown" | "countryInsights" | "mbbsMeta"
  >,
  activeTab: string,
) {
  const allowed = resolveAcademyTabs(view);
  return allowed.includes(activeTab as never)
    ? activeTab
    : defaultAcademyTab(view);
}

describe("SL-R-001 service library tab safety", () => {
  it("coaching view does not keep visa-only fees tab", () => {
    const allowed = resolveAcademyTabs(coachingView());
    expect(allowed).not.toContain("fees");
    expect(resolveSafeTab(coachingView(), "fees")).toBe("overview");
  });

  it("visa view without fee breakdown does not keep fees tab", () => {
    const allowed = resolveAcademyTabs(visaViewNoFees());
    expect(allowed).not.toContain("fees");
    expect(resolveSafeTab(visaViewNoFees(), "fees")).toBe("redflags");
  });

  it("coaching acceptance tab is invalid after switching to visa", () => {
    const allowed = resolveAcademyTabs(visaViewNoFees());
    expect(allowed).not.toContain("acceptance");
    expect(resolveSafeTab(visaViewNoFees(), "acceptance")).toBe("redflags");
  });
});
