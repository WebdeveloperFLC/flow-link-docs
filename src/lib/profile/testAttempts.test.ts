import { describe, expect, it } from "vitest";
import { buildProfileViewModelFromSources } from "@/lib/profile/normalizeProfile";
import {
  attemptsToLegacyMirror,
  attemptsToStoragePayload,
  buildProfileTests,
  deriveLegacyTestsFromAttempts,
  mergeLegacyEditsIntoAttempts,
  migrateLegacyToAttempts,
} from "@/lib/profile/testAttempts";
import { ensureAttemptId } from "@/lib/profile/profileRecordIds";
import type { ProfileAptitudeTestEntry, ProfileEnglishTestEntry, TestAttempt } from "@/lib/profile/types";

const LEGACY_CLIENT = {
  id: "client-e1",
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
    { type: "GRE", score: "310", date: "2023-01-15", sections: { quant: "160", verbal: "150" } },
    { type: "GRE", score: "320", date: "2024-06-01", sections: { quant: "165", verbal: "155" } },
  ],
  language_tests: {
    french: { status: "scheduled", exam_type: "TEF", test_date: "2026-09-15" },
    german: { status: "waived", exam_type: "TestDaF", waiver_reason: "University waiver" },
  },
};

describe("migrateLegacyToAttempts", () => {
  it("creates one attempt per english test type from __by_test__", () => {
    const { attempts, active_attempt_ids } = migrateLegacyToAttempts(LEGACY_CLIENT);
    const ielts = attempts.filter((a) => a.test_id === "ielts");
    const pte = attempts.filter((a) => a.test_id === "pte");
    expect(ielts).toHaveLength(1);
    expect(pte).toHaveLength(1);
    expect(ielts[0]?.overall_score).toBe("7.5");
    expect(ielts[0]?.variant).toBe("Academic");
    expect(active_attempt_ids.ielts).toBe(ielts[0]?.attempt_id);
  });

  it("preserves multiple GRE rows as separate attempts", () => {
    const { attempts } = migrateLegacyToAttempts(LEGACY_CLIENT);
    const gre = attempts.filter((a) => a.test_id === "gre");
    expect(gre).toHaveLength(2);
    expect(gre.map((a) => a.overall_score).sort()).toEqual(["310", "320"]);
  });

  it("migrates french and german language blocks", () => {
    const { attempts } = migrateLegacyToAttempts(LEGACY_CLIENT);
    expect(attempts.some((a) => a.test_id === "french" && a.status === "scheduled")).toBe(true);
    expect(attempts.some((a) => a.test_id === "german" && a.status === "waived")).toBe(true);
  });
});

describe("mergeLegacyEditsIntoAttempts", () => {
  it("updates active attempt without removing sibling GRE attempts", () => {
    const { attempts, active_attempt_ids } = migrateLegacyToAttempts(LEGACY_CLIENT);
    const greAttempts = attempts.filter((a) => a.test_id === "gre");
    expect(greAttempts).toHaveLength(2);

    const activeGreId = active_attempt_ids.gre!;
    const legacyGre: ProfileAptitudeTestEntry[] = [
      {
        test_id: "gre" as const,
        status: "taken" as const,
        overall: "325",
        test_date: "2024-06-01",
        sections: { quant: "170", verbal: "155" },
        linked_documents: [],
      },
    ];

    const merged = mergeLegacyEditsIntoAttempts(attempts, active_attempt_ids, {
      active_english_test_id: "ielts",
      english: [],
      aptitude: legacyGre,
      language: [],
    });

    const greAfter = merged.attempts.filter((a) => a.test_id === "gre");
    expect(greAfter).toHaveLength(2);
    const updated = greAfter.find((a) => a.attempt_id === activeGreId);
    expect(updated?.overall_score).toBe("325");
    const sibling = greAfter.find((a) => a.attempt_id !== activeGreId);
    expect(sibling?.overall_score).toBe("310");
  });

  it("creates new attempt when editing a test type with no attempts", () => {
    const merged = mergeLegacyEditsIntoAttempts([], {}, {
      active_english_test_id: "duolingo",
      english: [
        {
          test_id: "duolingo",
          status: "taken",
          overall: "120",
          test_date: "2026-01-01",
          test_expiry: null,
          sections: {},
          ielts_variant: null,
          ielts_test_type: null,
          country: null,
          linked_documents: [],
        },
      ],
      aptitude: [],
      language: [],
    });
    expect(merged.attempts).toHaveLength(1);
    expect(merged.attempts[0]?.test_id).toBe("duolingo");
    expect(merged.attempts[0]?.overall_score).toBe("120");
  });
});

describe("attempts round-trip", () => {
  it("serializes and re-parses multiple IELTS attempts", () => {
    const attempts: TestAttempt[] = [
      {
        attempt_id: ensureAttemptId("a1"),
        test_id: "ielts",
        category: "english",
        status: "taken",
        variant: "Academic",
        test_date: "2025-01-15",
        overall_score: "6.5",
        sections: { listening: "6.5" },
        linked_documents: [],
      },
      {
        attempt_id: ensureAttemptId("a2"),
        test_id: "ielts",
        category: "english",
        status: "taken",
        variant: "Academic",
        test_date: "2025-09-20",
        overall_score: "7.0",
        sections: { listening: "7.0" },
        linked_documents: [],
      },
      {
        attempt_id: ensureAttemptId("a3"),
        test_id: "ielts",
        category: "english",
        status: "scheduled",
        variant: "Academic",
        test_date: "2026-08-15",
        sections: {},
        linked_documents: [],
      },
    ];
    const active_attempt_ids = { ielts: attempts[1]!.attempt_id };
    const payload = attemptsToStoragePayload(attempts, active_attempt_ids);

    const client = {
      id: "c-multi",
      test_attempts: payload.test_attempts,
      active_attempt_ids: payload.active_attempt_ids,
    };
    const parsed = buildProfileTests(client);
    expect(parsed.attempts.filter((a) => a.test_id === "ielts")).toHaveLength(3);
    expect(parsed.active_attempt_ids.ielts).toBe(attempts[1]!.attempt_id);
    expect(parsed.english[0]?.overall).toBe("7.0");
  });

  it("dual-writes legacy mirror with all GRE attempts in other_tests", () => {
    const { attempts, active_attempt_ids } = migrateLegacyToAttempts(LEGACY_CLIENT);
    const mirror = attemptsToLegacyMirror(attempts, active_attempt_ids);
    expect(mirror.other_tests).toHaveLength(2);
    expect(mirror.english_test).toBe("IELTS");
    expect(mirror.english_overall).toBe("7.5");
  });

  it("round-trips ielts_test_type through storage and legacy mirror", () => {
    const attempts: TestAttempt[] = [
      {
        attempt_id: ensureAttemptId("ielts_cbt"),
        test_id: "ielts",
        category: "english",
        status: "taken",
        variant: "Academic",
        ielts_test_type: "CBT",
        overall_score: "7.5",
        sections: { listening: "8", reading: "7.5", writing: "7", speaking: "7.5" },
        linked_documents: [],
      },
    ];
    const active_attempt_ids = { ielts: attempts[0]!.attempt_id };
    const payload = attemptsToStoragePayload(attempts, active_attempt_ids);
    const parsed = buildProfileTests({
      id: "c-ielts-type",
      test_attempts: payload.test_attempts,
      active_attempt_ids: payload.active_attempt_ids,
    });
    const ielts = parsed.attempts.find((a) => a.test_id === "ielts");
    expect(ielts?.variant).toBe("Academic");
    expect(ielts?.ielts_test_type).toBe("CBT");

    const mirror = attemptsToLegacyMirror(parsed.attempts, parsed.active_attempt_ids);
    expect(mirror.english_sections?.ielts_variant).toBe("Academic");
    expect(mirror.english_sections?.ielts_test_type).toBe("CBT");
  });

  it("loads legacy IELTS without ielts_test_type", () => {
    const { attempts } = migrateLegacyToAttempts(LEGACY_CLIENT);
    const ielts = attempts.find((a) => a.test_id === "ielts");
    expect(ielts?.variant).toBe("Academic");
    expect(ielts?.ielts_test_type).toBeNull();
  });
});

describe("buildProfileViewModelFromSources Phase E", () => {
  it("includes attempts on view model from legacy client", () => {
    const vm = buildProfileViewModelFromSources({ client: LEGACY_CLIENT, profile: {} });
    expect(vm.tests.attempts.length).toBeGreaterThanOrEqual(4);
    expect(vm.tests.attempts.filter((a) => a.test_id === "gre")).toHaveLength(2);
    expect(vm.tests.english.some((e) => e.test_id === "ielts")).toBe(true);
  });

  it("prefers stored test_attempts over legacy when present", () => {
    const storedAttempts = [
      {
        attempt_id: "test_stored1",
        test_id: "ielts",
        category: "english",
        status: "taken",
        overall_score: "8.0",
        sections: {},
      },
    ];
    const vm = buildProfileViewModelFromSources({
      client: {
        ...LEGACY_CLIENT,
        test_attempts: storedAttempts,
        active_attempt_ids: { ielts: "test_stored1" },
      },
      profile: {},
    });
    expect(vm.tests.attempts).toHaveLength(1);
    expect(vm.tests.attempts[0]?.overall_score).toBe("8.0");
    expect(vm.tests.english[0]?.overall).toBe("8.0");
  });
});

describe("deriveLegacyTestsFromAttempts", () => {
  it("exposes only active attempt per type in compat arrays", () => {
    const attempts: TestAttempt[] = [
      {
        attempt_id: "t1",
        test_id: "ielts",
        category: "english",
        status: "taken",
        overall_score: "6.5",
        sections: {},
        linked_documents: [],
      },
      {
        attempt_id: "t2",
        test_id: "ielts",
        category: "english",
        status: "taken",
        overall_score: "7.5",
        sections: {},
        linked_documents: [],
      },
    ];
    const legacy = deriveLegacyTestsFromAttempts(attempts, { ielts: "t2" });
    expect(legacy.english).toHaveLength(1);
    expect(legacy.english[0]?.overall).toBe("7.5");
  });
});
