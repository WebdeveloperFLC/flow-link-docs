import { describe, expect, it } from "vitest";
import { buildProfileViewModelFromSources } from "@/lib/profile/normalizeProfile";
import { buildProfileServicesSummaryFromCodes } from "@/lib/profile/profileServicesSummary";
import { testLabel } from "@/lib/profile/profileTestCatalog";
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
  registration_number: "FL-2026-0042",
  branch: "Delhi — Saket",
  assigned_counselor_id: "counselor-uuid-1",
  status: "in_progress",
  lead_source: "Walk-in",
  created_at: "2025-08-12T09:00:00.000Z",
  visa_services: ["canada::student_visa"],
  coaching_services: ["ielts_coaching"],
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
    { type: "SAT", score: "1450", date: "2025-01-15", sections: { math: "750", reading: "700" } },
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
    french: { status: "scheduled", exam_type: "TEF", test_date: "2026-09-15" },
    german: { status: "not_taken", exam_type: "TestDaF", overall_score: null, test_date: "2026-09-01" },
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

const SERVICE_LABELS = {
  "canada::student_visa": "Canada Student Visa",
  ielts_coaching: "IELTS Coaching",
};

describe("buildProfileViewModelFromSources", () => {
  it("normalizes legacy client with extended meta and services", () => {
    const vm = buildProfileViewModelFromSources({
      client: LEGACY_CLIENT,
      profile: LEGACY_PROFILE,
      loadedAt: "2026-06-18T12:00:00.000Z",
      enrichment: {
        assigned_counselor_name: "Anita Verma",
        client_status_label: "In Progress",
        pipeline: { stage_label: "Document collection", progress_percent: 35 },
      },
    });

    expect(vm.meta.registration_number).toBe("FL-2026-0042");
    expect(vm.meta.branch).toBe("Delhi — Saket");
    expect(vm.meta.assigned_counselor_id).toBe("counselor-uuid-1");
    expect(vm.meta.assigned_counselor_name).toBe("Anita Verma");
    expect(vm.meta.client_status).toBe("in_progress");
    expect(vm.meta.client_status_label).toBe("In Progress");
    expect(vm.meta.lead_source).toBe("Walk-in");
    expect(vm.meta.created_at).toBe("2025-08-12T09:00:00.000Z");

    expect(vm.services.total_count).toBe(2);
    expect(vm.services.primary_service_code).toBe("canada::student_visa");
    expect(vm.services.pipeline?.stage_label).toBe("Document collection");
    expect(vm.services.pipeline?.progress_percent).toBe(35);
  });

  it("uses canonical test_id values with IELTS Academic on single active record", () => {
    const vm = buildProfileViewModelFromSources({
      client: LEGACY_CLIENT,
      profile: LEGACY_PROFILE,
    });

    expect(vm.tests.active_english_test_id).toBe("ielts");
    const ielts = vm.tests.english.find((e) => e.test_id === "ielts");
    expect(ielts?.status).toBe("taken");
    expect(ielts?.overall).toBe("7.5");
    expect(ielts?.ielts_variant).toBe("Academic");
    expect(vm.tests.english.filter((e) => e.test_id === "ielts")).toHaveLength(1);

    const pte = vm.tests.english.find((e) => e.test_id === "pte");
    expect(pte?.status).toBe("planned");

    expect(vm.tests.aptitude.find((a) => a.test_id === "gre")?.overall).toBe("320");
    expect(vm.tests.aptitude.find((a) => a.test_id === "sat")?.overall).toBe("1450");

    expect(vm.tests.language.find((l) => l.test_id === "french")?.exam_type).toBe("TEF");
    expect(vm.tests.language.find((l) => l.test_id === "german")?.exam_type).toBe("TestDaF");
  });

  it("normalizes IELTS General variant on active record", () => {
    const vm = buildProfileViewModelFromSources({
      client: {
        ...LEGACY_CLIENT,
        english_sections: {
          listening: "6.5",
          ielts_variant: "General",
          __by_test__: {
            IELTS: {
              status: "taken",
              overall: "6.5",
              sections: { listening: "6.5", reading: "6.0", writing: "6.5", speaking: "7.0" },
            },
          },
        },
      },
      profile: LEGACY_PROFILE,
    });
    const ielts = vm.tests.english.find((e) => e.test_id === "ielts");
    expect(ielts?.ielts_variant).toBe("General");
    expect(ielts?.overall).toBe("6.5");
  });

  it("merges document refs and multiple linked docs on education", () => {
    const eduId = ensureEducationId("edu_abc123");
    const refs: ClientDocumentRefRow[] = [
      {
        id: "ref-1",
        client_id: "client-legacy-1",
        document_id: "doc-1",
        ref_key: englishTestRefKey("ielts"),
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
      {
        id: "ref-3",
        client_id: "client-legacy-1",
        document_id: "doc-3",
        ref_key: educationRefKey(eduId),
        slot: "degree_certificate",
        label: "Degree Certificate",
        linked_at: "2026-01-03T00:00:00Z",
        file_name: "degree.pdf",
      },
    ];

    const clientWithEduId = {
      ...LEGACY_CLIENT,
      education_history: [
        {
          ...LEGACY_CLIENT.education_history[0],
          id: eduId,
          linked_documents: [
            { document_id: "doc-4", slot: "marksheet", label: "Marksheet", linked_at: "2026-01-04T00:00:00Z" },
          ],
        },
      ],
    };

    const vm = buildProfileViewModelFromSources({
      client: clientWithEduId,
      profile: LEGACY_PROFILE,
      documentRefs: refs,
    });

    const ielts = vm.tests.english.find((e) => e.test_id === "ielts");
    expect(ielts?.linked_documents).toHaveLength(1);
    expect(ielts?.linked_documents[0].file_name).toBe("ielts_trf.pdf");

    expect(vm.education[0].linked_documents).toHaveLength(3);
    expect(vm.education[0].linked_documents.map((d) => d.slot).sort()).toEqual(
      ["degree_certificate", "marksheet", "transcript"].sort(),
    );
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
  });
});

describe("buildProfileServicesSummaryFromCodes", () => {
  it("builds minimal services snapshot", () => {
    const services = buildProfileServicesSummaryFromCodes(
      { visa: ["canada::student_visa"], coaching: ["ielts_coaching"] },
      SERVICE_LABELS,
      { stage_label: "Visa filing", progress_percent: 60 },
    );
    expect(services.total_count).toBe(2);
    expect(services.primary_label).toBe("Canada Student Visa");
    expect(services.items[0].category).toBe("visa");
    expect(services.pipeline?.progress_percent).toBe(60);
  });
});

describe("toEditState", () => {
  it("clones view model without sharing mutable references", () => {
    const vm = buildProfileViewModelFromSources({ client: LEGACY_CLIENT, profile: LEGACY_PROFILE });
    const edit = toEditState(vm, { activeSection: "tests" });

    expect(edit.selectedEnglishTestId).toBe("ielts");
    expect(edit.tests.active_english_test_id).toBe("ielts");
    edit.identity.first_name = "Changed";
    expect(vm.identity.first_name).toBe("Priya");
  });
});

describe("summarizeProfile", () => {
  it("uses active attempts only with catalog labels", () => {
    const vm = buildProfileViewModelFromSources({ client: LEGACY_CLIENT, profile: LEGACY_PROFILE });
    const tests = summarizeProfileSection(vm, "tests");
    expect(tests.lines[0]).toContain(testLabel("ielts"));
    expect(tests.lines[0]).toContain("Academic");
    expect(tests.lines[0]).toContain("Taken");
    expect(tests.lines[0]).toContain("7.5");
    expect(tests.lines.some((l) => l.includes(testLabel("sat")))).toBe(true);
    expect(tests.lines.some((l) => l.toLowerCase().includes("pte"))).toBe(false);

    const c360 = summarizeProfileFor360(vm);
    expect(c360.highlights.some((h) => h.includes(testLabel("ielts")))).toBe(true);
  });
});

describe("computeCompletion", () => {
  it("uses same view model as summaries", () => {
    const vm = buildProfileViewModelFromSources({ client: LEGACY_CLIENT, profile: LEGACY_PROFILE });
    const result = computeCompletion(vm);
    expect(result.sections).toHaveLength(5);
    expect(result.overall.percent).toBeGreaterThan(0);
  });
});
