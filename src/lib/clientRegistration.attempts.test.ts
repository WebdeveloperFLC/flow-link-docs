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
});
