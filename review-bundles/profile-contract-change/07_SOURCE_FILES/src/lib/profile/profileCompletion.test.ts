import { describe, expect, it } from "vitest";
import { buildProfileViewModelFromSources } from "@/lib/profile/normalizeProfile";
import { computeCompletion, completionForSection } from "@/lib/profile/profileCompletion";
import { getSlotsForScope, isValidSlotForScope } from "@/lib/profile/profileDocumentSlots";
import { testLabel } from "@/lib/profile/profileTestCatalog";

const EMPTY_VM = buildProfileViewModelFromSources({
  client: { id: "empty-client", full_name: "Empty Client" },
  profile: {},
});

describe("profileCompletion", () => {
  it("returns zero-ish completion for empty profile", () => {
    const result = computeCompletion(EMPTY_VM);
    expect(result.overall.percent).toBeLessThan(20);
    expect(result.sections.find((s) => s.section === "education")?.filled).toBe(0);
    expect(EMPTY_VM.services.total_count).toBe(0);
  });

  it("counts extended test status planned as filled", () => {
    const vm = buildProfileViewModelFromSources({
      client: {
        id: "c1",
        english_test: "PTE",
        english_test_status: "planned",
        english_sections: {
          __by_test__: {
            PTE: { status: "planned", overall: null, test_date: null, test_expiry: null, sections: {} },
          },
        },
      },
      profile: {},
    });
    expect(vm.tests.active_english_test_id).toBe("pte");
    const tests = completionForSection(vm, "tests");
    expect(tests.filled).toBeGreaterThanOrEqual(1);
  });

  it("flags missing documents using catalog labels", () => {
    const vm = buildProfileViewModelFromSources({
      client: {
        id: "c2",
        english_test: "IELTS",
        english_test_status: "taken",
        english_overall: "7",
        english_sections: { listening: "7", reading: "7", writing: "7", speaking: "7" },
        education_history: [{ level: "Bachelor's", institution: "ABC College" }],
        work_experience: [{ company: "XYZ Corp", role: "Dev" }],
      },
      profile: {},
    });
    const result = computeCompletion(vm);
    expect(result.missingRequiredDocuments.some((m) => m.includes(testLabel("ielts")))).toBe(true);
  });

  it("does not flag documents when linked", () => {
    const vm = buildProfileViewModelFromSources({
      client: {
        id: "c3",
        english_test: "IELTS",
        english_test_status: "taken",
        english_overall: "7",
        english_sections: {
          listening: "7",
          linked_documents: [{ document_id: "d1", slot: "trf", label: "TRF" }],
        },
        education_history: [
          {
            id: "edu_x",
            level: "Bachelor's",
            linked_documents: [{ document_id: "d2", slot: "transcript", label: "Transcript" }],
          },
        ],
      },
      profile: {},
    });
    const result = computeCompletion(vm);
    expect(result.missingRequiredDocuments.filter((m) => m.includes(testLabel("ielts")))).toHaveLength(0);
  });
});

describe("profileDocumentSlots", () => {
  it("exposes system slots per scope (Phase 1 — no per-client custom)", () => {
    const testSlots = getSlotsForScope("tests");
    expect(testSlots.map((s) => s.id)).toContain("trf");
    expect(isValidSlotForScope("transcript", "education")).toBe(true);
    expect(testSlots.every((s) => s.source === "system")).toBe(true);
  });
});
