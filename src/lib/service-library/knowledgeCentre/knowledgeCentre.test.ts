import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { validateKnowledgeCentreJson } from "./validateKnowledgeCentreJson";
import {
  resolveKnowledgeCentreNavigation,
  resolveKnowledgeCentreTabLabel,
  sectionHasContent,
} from "./resolveKnowledgeCentreNavigation";
import type { KnowledgeCentreMetadata } from "./types";
import type { AcademyViewModel } from "../buildAcademyViewModel";
import { isFlcKnowledgeGuide } from "../knowledgeGuide/types";
import { normalizeKnowledgeGuide } from "../knowledgeGuide/normalizeKnowledgeGuide";

const canadaFixturePath = path.resolve(
  process.cwd(),
  "content/service-library/canada-student-visa.json",
);

function loadCanadaFixture(): KnowledgeCentreMetadata {
  return JSON.parse(fs.readFileSync(canadaFixturePath, "utf8")) as KnowledgeCentreMetadata;
}

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
    guideSources: [],
    downloadTemplates: [],
    checklistGuide: null,
    documentBinder: null,
    ...overrides,
  };
}

describe("validateKnowledgeCentreJson", () => {
  it("accepts valid legacy schemaVersion 1.0 payload", () => {
    const result = validateKnowledgeCentreJson(baseCanadaMeta());
    expect(result.ok).toBe(true);
    expect(result.schemaVersion).toBe("1.0");
    expect(result.issues).toHaveLength(0);
  });

  it("accepts Canada ZIP fixture with schemaRef", () => {
    const meta = loadCanadaFixture();
    expect(isFlcKnowledgeGuide(meta)).toBe(true);
    const result = validateKnowledgeCentreJson(meta, { requireSchemaVersion: true });
    expect(result.ok).toBe(true);
    expect(result.schemaRef).toBe("flc-knowledge-guide-schema-v1.0");
  });

  it("rejects schemaVersion 1.0 without navigation.sections (legacy)", () => {
    const meta = { ...baseCanadaMeta(), navigation: { sections: [] } };
    const result = validateKnowledgeCentreJson(meta);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.path === "navigation.sections")).toBe(true);
  });

  it("rejects ZIP guide without schemaRef on strict import", () => {
    const meta = loadCanadaFixture();
    delete (meta as Record<string, unknown>).schemaRef;
    const result = validateKnowledgeCentreJson(meta, { requireSchemaVersion: true });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid legacy section id", () => {
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

describe("normalizeKnowledgeGuide", () => {
  it("detects ZIP guide by schemaRef", () => {
    const normalized = normalizeKnowledgeGuide(loadCanadaFixture());
    expect(normalized.kind).toBe("zip");
    if (normalized.kind === "zip") {
      expect(normalized.guide.slug).toContain("canada-student-visa");
    }
  });

  it("detects legacy KC navigation.sections", () => {
    const normalized = normalizeKnowledgeGuide(baseCanadaMeta());
    expect(normalized.kind).toBe("legacy-kc");
  });
});

describe("resolveKnowledgeCentreNavigation", () => {
  it("returns tabs in legacy navigation order with content only", () => {
    const meta = baseCanadaMeta();
    const view = minimalView();
    expect(resolveKnowledgeCentreNavigation(meta, view)).toEqual([
      "overview",
      "redflags",
      "faqs",
      "quiz",
    ]);
  });

  it("resolves Canada ZIP navigation keys to academy tabs", () => {
    const meta = loadCanadaFixture();
    const view = minimalView({
      checklistGuide: { items: meta.checklistItems?.items ?? [] },
      visaForms: (meta.visaForms?.forms ?? []).map((f, i) => ({
        id: f.code || String(i),
        code: f.code,
        title: f.name,
        url: f.url,
        isOnline: true,
      })),
      faqs: meta.faqs ?? [],
      redFlags: (meta.redFlags ?? []).map((r, i) => ({
        num: i + 1,
        title: r.title,
        description: r.description ?? "",
        fix: r.fix,
        severity: r.severity ?? "Common",
      })),
      quiz: meta.quiz ?? [],
      fullCostBreakdown: meta.fullCostBreakdown ?? null,
      countryInsights: {},
      guideSources: meta.sources ?? [],
      downloadTemplates: meta.downloads?.templates ?? [],
      documentBinder: meta.documentBinder ?? null,
      dosDonts: {
        dos: meta.donts?.dos ?? [],
        donts: meta.donts?.donts ?? [],
        mistakes: meta.donts?.mistakes ?? [],
      },
      compliance: meta.compliance ?? [],
      sampleDocs: (meta.sampleDocs?.items ?? []).map((d) => ({
        title: d.title,
        isImage: false,
      })),
      process: (meta.timeline ?? []).map((t, i) => ({
        step: i + 1,
        title: t.title,
        duration: t.weeks,
        owner: "Counselor",
      })),
      eligibility: (meta.eligibility ?? []).map((e) => ({
        criterion: e.criterion,
        met: !!e.met,
        note: e.note,
      })),
    });

    const tabs = resolveKnowledgeCentreNavigation(meta, view);
    expect(tabs).toContain("overview");
    expect(tabs).toContain("eligibility");
    expect(tabs).toContain("fees");
    expect(tabs).toContain("checklist");
    expect(tabs).toContain("downloads");
    expect(tabs).not.toContain("related");
    expect(tabs).not.toContain("sources");
    expect(tabs?.indexOf("overview")).toBeLessThan(tabs?.indexOf("eligibility") ?? 0);
  });

  it("uses ZIP navigation labels via resolveKnowledgeCentreTabLabel", () => {
    const meta = loadCanadaFixture();
    expect(resolveKnowledgeCentreTabLabel("fees", meta, "Fees")).toBe("Cost Planning");
    expect(resolveKnowledgeCentreTabLabel("countryinsights", meta, "Country")).toBe("Working Rights");
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
