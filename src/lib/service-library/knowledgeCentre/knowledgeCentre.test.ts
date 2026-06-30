import { describe, expect, it } from "vitest";
import { validateKnowledgeCentreJson } from "./validateKnowledgeCentreJson";
import { resolveKnowledgeCentreNavigation, sectionHasContent } from "./resolveKnowledgeCentreNavigation";
import type { KnowledgeCentreMetadata } from "./types";
import type { AcademyViewModel } from "../buildAcademyViewModel";

const baseCanadaMeta = (): KnowledgeCentreMetadata => ({
  schemaVersion: "1.0",
  displayName: "Canada – Student Visa",
  navigation: {
    sections: [
      { id: "overview", sortOrder: 10 },
      { id: "redflags", sortOrder: 20 },
      { id: "faqs", sortOrder: 30 },
      { id: "quiz", sortOrder: 40 },
    ],
  },
  about: [{ label: "Description", value: "Study permit guide" }],
  redFlags: [{ title: "Weak funds", fix: "Season statements", severity: "Common" }],
  faqs: [{ q: "Is SDS open?", a: "No — regular stream only." }],
  quiz: [
    {
      question: "LOA required?",
      options: ["Yes", "No"],
      correctIndex: 0,
    },
  ],
});

function minimalView(overrides: Partial<AcademyViewModel> = {}): AcademyViewModel {
  return {
    masterId: "test",
    country: "Canada",
    categoryLabel: "Visa",
    breadcrumbTitle: "Canada",
    title: "Canada – Student Visa",
    subtitle: "Study permit",
    version: "v1.0",
    versionStatus: "Live",
    updatedLabel: "",
    tags: [],
    chips: [],
    policyAlert: null,
    alert: null,
    kpis: [],
    about: [{ label: "Description", value: "Study permit guide" }],
    eligibility: [],
    redFlagsBanner: "",
    redFlags: [],
    faqs: [],
    compliance: [],
    proTips: [],
    postApproval: [],
    compare: null,
    performance: { ourRate: 0, industryRate: 0, stats: [] },
    approvalFactors: [],
    timeline: [],
    fees: { consultancy: "—", govt: "—", thirdParty: "—" },
    feeBreakdown: null,
    fullCostBreakdown: null,
    countryInsights: null,
    checklist: { completed: 0, total: 0, submission: [], documentNotes: "" },
    process: [],
    dosDonts: { dos: [], donts: [], mistakes: [] },
    resources: [],
    downloads: [],
    visaForms: [],
    sampleDocs: [],
    quiz: [],
    internalNotes: [],
    changelog: [],
    relatedServices: [],
    sopHtml: null,
    shareLink: "",
    needsReview: false,
    learningMinutes: 0,
    isCoaching: false,
    isMbbs: false,
    mbbsMeta: null,
    coachingProfile: null,
    testDayGuide: null,
    documentStructure: null,
    knowledgeCentreMeta: null,
    ...overrides,
  };
}

describe("validateKnowledgeCentreJson", () => {
  it("accepts valid schemaVersion 1.0 payload", () => {
    const result = validateKnowledgeCentreJson(baseCanadaMeta());
    expect(result.ok).toBe(true);
    expect(result.schemaVersion).toBe("1.0");
    expect(result.issues).toHaveLength(0);
  });

  it("rejects schemaVersion 1.0 without navigation.sections", () => {
    const meta = { ...baseCanadaMeta(), navigation: { sections: [] } };
    const result = validateKnowledgeCentreJson(meta);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.path === "navigation.sections")).toBe(true);
  });

  it("rejects invalid section id", () => {
    const meta = {
      ...baseCanadaMeta(),
      navigation: { sections: [{ id: "not-a-tab" }] },
    };
    const result = validateKnowledgeCentreJson(meta);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.path.includes(".id"))).toBe(true);
  });

  it("rejects quiz with out-of-range correctIndex", () => {
    const meta = {
      ...baseCanadaMeta(),
      quiz: [{ question: "Q?", options: ["A", "B"], correctIndex: 5 }],
    };
    const result = validateKnowledgeCentreJson(meta);
    expect(result.ok).toBe(false);
  });

  it("allows legacy payload without schemaVersion when structurally valid", () => {
    const result = validateKnowledgeCentreJson({
      displayName: "Legacy service",
      faqs: [{ q: "Q", a: "A" }],
    });
    expect(result.ok).toBe(true);
    expect(result.schemaVersion).toBeNull();
  });
});

describe("resolveKnowledgeCentreNavigation", () => {
  it("returns tabs in navigation order with content only", () => {
    const meta = baseCanadaMeta();
    const view = minimalView();
    expect(resolveKnowledgeCentreNavigation(meta, view)).toEqual([
      "overview",
      "redflags",
      "faqs",
      "quiz",
    ]);
  });

  it("hides sections without content (no placeholders)", () => {
    const meta: KnowledgeCentreMetadata = {
      schemaVersion: "1.0",
      displayName: "Test",
      navigation: {
        sections: [
          { id: "overview", sortOrder: 10 },
          { id: "fees", sortOrder: 20 },
          { id: "binder", sortOrder: 30 },
        ],
      },
      about: [{ label: "A", value: "B" }],
    };
    const view = minimalView();
    expect(resolveKnowledgeCentreNavigation(meta, view)).toEqual(["overview"]);
  });

  it("shows checklist when submission items exist on view", () => {
    const meta: KnowledgeCentreMetadata = {
      schemaVersion: "1.0",
      displayName: "Test",
      navigation: { sections: [{ id: "checklist", sortOrder: 10 }] },
    };
    const view = minimalView({
      checklist: {
        completed: 1,
        total: 2,
        submission: [{ id: "1", label: "Passport", mandatory: true, done: true }],
        documentNotes: "",
      },
    });
    expect(sectionHasContent("checklist", meta, view)).toBe(true);
    expect(resolveKnowledgeCentreNavigation(meta, view)).toEqual(["checklist"]);
  });

  it("returns null when navigation is absent", () => {
    const meta: KnowledgeCentreMetadata = { displayName: "Legacy" };
    expect(resolveKnowledgeCentreNavigation(meta, minimalView())).toBeNull();
  });
});
