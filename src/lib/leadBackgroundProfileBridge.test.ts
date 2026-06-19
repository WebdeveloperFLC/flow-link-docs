import { describe, expect, it } from "vitest";
import {
  applyEducationRecordsToLeadBackground,
  applyTestsPatchToLeadBackground,
  educationRecordsFromLeadBackground,
  testsStateFromLeadBackground,
} from "@/lib/leadBackgroundProfileBridge";
import { leadToBackgroundState } from "@/lib/leadBackground";
import { createEmptyAttempt } from "@/lib/profile/testAttempts";
import { ensureEducationId } from "@/lib/profile/profileRecordIds";

describe("leadBackgroundProfileBridge", () => {
  it("maps education to full profile record shape", () => {
    const bg = leadToBackgroundState({
      education_history: [
        {
          level: "Bachelor's",
          institution: "DU",
          year: "2020",
          percentage_cgpa: "78%",
          country: "India",
        },
      ],
    } as never);
    const records = educationRecordsFromLeadBackground(bg);
    expect(records[0]?.qualification_type).toBe("Bachelor's");
    expect(records[0]?.institution_name).toBe("DU");
    expect(records[0]?.score).toBe("78%");

    const roundTrip = applyEducationRecordsToLeadBackground(bg, records);
    expect(roundTrip.education_history[0]?.level).toBe("Bachelor's");
  });

  it("round-trips attempt add on lead background", () => {
    const bg = leadToBackgroundState({ english_test: "IELTS" } as never);
    const gre = createEmptyAttempt("gre");
    Object.assign(gre, { status: "planned" });
    const next = applyTestsPatchToLeadBackground(bg, {
      attempts: [...(bg.attempts ?? []), gre],
      active_attempt_ids: { ...(bg.active_attempt_ids ?? {}), gre: gre.attempt_id },
    });
    const tests = testsStateFromLeadBackground(next);
    expect(tests.attempts.some((a) => a.test_id === "gre")).toBe(true);
    expect(next.other_tests?.some((t) => t.type === "GRE")).toBe(true);
  });

  it("education records get stable ids", () => {
    const id = ensureEducationId();
    const bg = leadToBackgroundState({ education_history: [{ level: "PG", id }] } as never);
    expect(educationRecordsFromLeadBackground(bg)[0]?.id).toBe(id);
  });
});
