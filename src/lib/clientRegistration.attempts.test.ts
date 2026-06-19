import { describe, expect, it } from "vitest";
import { prefillFromLead } from "@/lib/clientRegistration";
import { leadToBackgroundState } from "@/lib/leadBackground";
import { ensureAttemptId } from "@/lib/profile/profileRecordIds";

describe("prefillFromLead attempts (Phase E5)", () => {
  it("copies test_attempts and active_attempt_ids to client draft", () => {
    const attemptId = ensureAttemptId("conv");
    const lead = {
      id: "lead-1",
      first_name: "A",
      last_name: "B",
      test_attempts: [
        {
          attempt_id: attemptId,
          test_id: "gre",
          category: "aptitude",
          status: "taken",
          overall_score: "320",
          sections: {},
        },
      ],
      active_attempt_ids: { gre: attemptId },
      english_test: "IELTS",
    } as never;

    const draft = prefillFromLead(lead);
    expect(draft.test_attempts?.length).toBe(1);
    expect(draft.active_attempt_ids?.gre).toBe(attemptId);
    expect(draft.other_tests?.some((t) => t.type === "GRE")).toBe(true);

    const reloaded = leadToBackgroundState({
      ...lead,
      test_attempts: draft.test_attempts,
      active_attempt_ids: draft.active_attempt_ids,
      other_tests: draft.other_tests,
    } as never);
    expect(reloaded.attempts?.some((a) => a.test_id === "gre")).toBe(true);
  });

  it("preserves IELTS variant and test type via prefillFromLead", () => {
    const attemptId = ensureAttemptId("ielts_conv");
    const lead = {
      id: "lead-ielts",
      first_name: "A",
      last_name: "B",
      english_test: "IELTS",
      english_test_status: "taken",
      english_overall: "7.5",
      english_sections: {
        listening: "8",
        reading: "7.5",
        writing: "7",
        speaking: "7.5",
        ielts_variant: "Academic",
        ielts_test_type: "CBT",
      },
      test_attempts: [
        {
          attempt_id: attemptId,
          test_id: "ielts",
          category: "english",
          status: "taken",
          variant: "Academic",
          ielts_test_type: "CBT",
          overall_score: "7.5",
          sections: { listening: "8", reading: "7.5", writing: "7", speaking: "7.5" },
        },
      ],
      active_attempt_ids: { ielts: attemptId },
    } as never;

    const draft = prefillFromLead(lead);
    expect(draft.english_sections?.ielts_variant).toBe("Academic");
    expect(draft.english_sections?.ielts_test_type).toBe("CBT");
    const stored = draft.test_attempts?.find((a) => a.test_id === "ielts") as {
      variant?: string;
      ielts_test_type?: string;
    };
    expect(stored?.variant).toBe("Academic");
    expect(stored?.ielts_test_type).toBe("CBT");
  });
});
