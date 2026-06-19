import { describe, expect, it } from "vitest";
import { buildProfileViewModelFromSources } from "@/lib/profile/normalizeProfile";
import { toEditState } from "@/lib/profile/toEditState";
import { summarizeProfileFor360, summarizeProfileSection } from "@/lib/profile/summarizeProfile";
import { computeCompletion } from "@/lib/profile/profileCompletion";
import {
  educationRefKey,
  ensureEducationId,
  englishTestRefKey,
} from "@/lib/profile/profileRecordIds";
import type { ClientDocumentRefRow } from "@/lib/profile/types";

const LEGACY_CLIENT = {
  id: "client-legacy-1",
  full_name: "Priya Sharma",
  first_name: "Priya",
  last_name: "Sharma",
  email: "priya@example.com",
  phone: "+91 98765 43210",
  country_code: "IN",
  date_of_birth: "1998-03-15",
  gender: "Female",
  country_of_citizenship: "India",
  passport_number: "Z1234567",
  passport_expiry: "2030-01-01",
  english_test: "IELTS",
  english_test_status: "taken",
  english_overall: "7.5",
  english_test_date: "2025-11-20",
  english_test_expiry: "2027-11-20",
  english_sections: {
    listening: "8",
    reading: "7.5",
    writing: "7",
    speaking: "7.5",
    ielts_variant: "Academic",
    __by_test__: {
      IELTS: {
        status: "taken",
        overall: "7.5",
        test_date: "2025-11-20",
        test_expiry: "2027-11-20",
        sections: { listening: "8", reading: "7.5", writing: "7", speaking: "7.5" },
      },
      PTE: { status: "planned", overall: null, test_date: null, test_expiry: null, sections: {} },
    },
  },
  other_tests: [
    { type: "GRE", score: "320", date: "2024-06-01", sections: { quant: "165", verbal: "155" } },
  ],
  education_history: [
    {
      level: "Bachelor's",
      institution: "Delhi University",
      year: "2020",
      percentage_cgpa: "78%",
      country: "India",
      specialization: "Commerce",
    },
  ],
  work_experience: [
    {
      company: "TCS",
      role: "Analyst",
      start_date: "2021-01-01",
      end_date: "2023-06-30",
      country: "India",
      city: "Delhi",
    },
  ],
  language_tests: {
    french: { status: "not_taken", exam_type: null, overall_score: null },
    german: { status: "scheduled", exam_type: "TestDaF", overall_score: null, test_date: "2026-09-01" },
  },
  last_education: "Bachelor's",
  institution_name: "Delhi University",
  year_of_passing: "2020",
  percentage_cgpa: "78%",
};

const LEGACY_PROFILE = {
  client_id: "client-legacy-1",
  date_of_birth: "1998-03-15",
  gender: "Female",
  nationality: "India",
  passport_number: "Z1234567",
  passport_expiry: "2030-01-01",
  address_city: "New Delhi",
  address_country: "India",
  emergency_contact_name: "Raj Sharma",
  emergency_contact_phone: "+91 99999 88888",
};

describe("buildProfileViewModelFromSources", () => {
  it("normalizes legacy client + profile into immutable ProfileViewModel", () => {
    const vm = buildProfileViewModelFromSources({
      client: LEGACY_CLIENT,
      profile: LEGACY_PROFILE,
      loadedAt: "2026-06-18T12:00:00.000Z",
    });

    expect(vm.meta.client_id).toBe("client-legacy-1");
    expect(vm.meta.loaded_at).toBe("2026-06-18T12:00:00.000Z");
    expect(vm.identity.full_name).toBe("Priya Sharma");
    expect(vm.identity.passport_number).toBe("Z1234567");
    expect(vm.contact.phone_primary).toBe("+91 98765 43210");
    expect(vm.contact.address_city).toBe("New Delhi");
    expect(vm.contact.emergency_contact_name).toBe("Raj Sharma");

    expect(vm.tests.active_english_test).toBe("IELTS");
    const ielts = vm.tests.english.find((e) => e.test_type === "IELTS");
    expect(ielts?.status).toBe("taken");
    expect(ielts?.overall).toBe("7.5");
    expect(ielts?.ielts_variant).toBe("Academic");
    expect(ielts?.sections.listening).toBe("8");

    const pte = vm.tests.english.find((e) => e.test_type === "PTE");
    expect(pte?.status).toBe("planned");

    expect(vm.tests.aptitude[0]?.test_type).toBe("GRE");
    expect(vm.tests.aptitude[0]?.overall).toBe("320");

    expect(vm.tests.language.find((l) => l.language === "german")?.exam_type).toBe("TestDaF");

    expect(vm.education).toHaveLength(1);
    expect(vm.education[0].qualification_type).toBe("Bachelor's");
    expect(vm.education[0].institution_name).toBe("Delhi University");
    expect(vm.education[0].score).toBe("78%");
    expect(vm.education[0].id).toMatch(/^edu_/);

    expect(vm.experience[0].company).toBe("TCS");
    expect(vm.experience[0].designation).toBe("Analyst");
    expect(vm.experience[0].id).toMatch(/^exp_/);
  });

  it("merges document refs by stable ref_key", () => {
    const eduId = ensureEducationId("edu_abc123");
    const refs: ClientDocumentRefRow[] = [
      {
        id: "ref-1",
        client_id: "client-legacy-1",
        document_id: "doc-1",
        ref_key: englishTestRefKey("IELTS"),
        slot: "trf",
        label: "IELTS TRF",
        linked_at: "2026-01-01T00:00:00Z",
        file_name: "ielts_trf.pdf",
      },
      {
        id: "ref-2",
        client_id: "client-legacy-1",
        document_id: "doc-2",
        ref_key: educationRefKey(eduId),
        slot: "transcript",
        label: "Transcript",
        linked_at: "2026-01-02T00:00:00Z",
        file_name: "transcript.pdf",
      },
    ];

    const clientWithEduId = {
      ...LEGACY_CLIENT,
      education_history: [{ ...LEGACY_CLIENT.education_history[0], id: eduId }],
    };

    const vm = buildProfileViewModelFromSources({
      client: clientWithEduId,
      profile: LEGACY_PROFILE,
      documentRefs: refs,
    });

    const ielts = vm.tests.english.find((e) => e.test_type === "IELTS");
    expect(ielts?.linked_documents).toHaveLength(1);
    expect(ielts?.linked_documents[0].file_name).toBe("ielts_trf.pdf");

    expect(vm.education[0].linked_documents[0].document_id).toBe("doc-2");
  });

  it("rebuilds education from legacy scalars when json history empty", () => {
    const vm = buildProfileViewModelFromSources({
      client: {
        id: "c2",
        last_education: "Master's",
        institution_name: "IIT Bombay",
        year_of_passing: "2022",
        percentage_cgpa: "8.2 CGPA",
        education_history: [],
      },
      profile: {},
    });
    expect(vm.education).toHaveLength(1);
    expect(vm.education[0].qualification_type).toBe("Master's");
    expect(vm.education[0].institution_name).toBe("IIT Bombay");
  });
});

describe("toEditState", () => {
  it("clones view model without sharing mutable references", () => {
    const vm = buildProfileViewModelFromSources({ client: LEGACY_CLIENT, profile: LEGACY_PROFILE });
    const edit = toEditState(vm, { activeSection: "tests" });

    expect(edit.clientId).toBe(vm.meta.client_id);
    expect(edit.activeSection).toBe("tests");
    expect(edit.editingSection).toBeNull();
    expect(edit.identity).not.toBe(vm.identity);
    expect(edit.tests.english).not.toBe(vm.tests.english);

    edit.identity.first_name = "Changed";
    expect(vm.identity.first_name).toBe("Priya");
  });
});

describe("summarizeProfile", () => {
  it("derives section summaries and Client 360 from same view model", () => {
    const vm = buildProfileViewModelFromSources({ client: LEGACY_CLIENT, profile: LEGACY_PROFILE });
    const identity = summarizeProfileSection(vm, "identity");
    expect(identity.headline).toBe("Priya Sharma");
    expect(identity.lines.some((l) => l.includes("Z1234567"))).toBe(true);

    const tests = summarizeProfileSection(vm, "tests");
    expect(tests.lines[0]).toContain("IELTS");
    expect(tests.lines[0]).toContain("Academic");

    const c360 = summarizeProfileFor360(vm);
    expect(c360.sections).toHaveLength(5);
    expect(c360.highlights.length).toBeGreaterThan(0);
    for (const s of c360.sections) {
      expect(s.lines.length).toBeLessThanOrEqual(3);
    }
  });
});

describe("computeCompletion", () => {
  it("uses same view model as summaries", () => {
    const vm = buildProfileViewModelFromSources({ client: LEGACY_CLIENT, profile: LEGACY_PROFILE });
    const result = computeCompletion(vm);
    expect(result.sections).toHaveLength(5);
    expect(result.overall.total).toBeGreaterThan(0);
    expect(result.overall.percent).toBeGreaterThan(0);

    const identity = result.sections.find((s) => s.section === "identity");
    expect(identity?.filled).toBeGreaterThanOrEqual(5);
  });
});
