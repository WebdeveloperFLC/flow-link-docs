import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileTestsPanel } from "@/components/profile/ProfileTestsPanel";
import { TestAttemptForm } from "@/components/profile/TestAttemptForm";
import { visibilityForAttemptStatus } from "@/lib/profile/testAttemptFormRules";
import { ensureFullTestCatalog } from "@/lib/profile/ensureTestCatalog";
import type { TestAttempt } from "@/lib/profile/types";

const IELTS_TAKEN: TestAttempt = {
  attempt_id: "test_a1",
  test_id: "ielts",
  category: "english",
  status: "taken",
  variant: "Academic",
  test_date: "2025-11-20",
  expiry_date: "2027-11-20",
  overall_score: "7.5",
  sections: { listening: "8", reading: "7.5", writing: "7", speaking: "7.5" },
  linked_documents: [],
};

describe("testAttemptFormRules", () => {
  it("hides scores when status is scheduled", () => {
    const vis = visibilityForAttemptStatus("scheduled", "english");
    expect(vis.showOverall).toBe(false);
    expect(vis.showSectionals).toBe(false);
    expect(vis.showTestDate).toBe(true);
  });

  it("shows full capture when status is taken", () => {
    const vis = visibilityForAttemptStatus("taken", "english");
    expect(vis.showOverall).toBe(true);
    expect(vis.showSectionals).toBe(true);
    expect(vis.showDocuments).toBe(true);
  });

  it("shows waiver reason only when waived", () => {
    expect(visibilityForAttemptStatus("waived", "english").showWaiverReason).toBe(true);
    expect(visibilityForAttemptStatus("taken", "english").showWaiverReason).toBe(false);
  });
});

describe("TestAttemptForm", () => {
  it("renders sectional inputs for IELTS taken in edit mode", () => {
    render(<TestAttemptForm attempt={IELTS_TAKEN} mode="edit" onChange={() => {}} />);
    expect(screen.getByText("Listening")).toBeInTheDocument();
    expect(screen.getByText("IELTS variant")).toBeInTheDocument();
  });

  it("hides overall when status is scheduled", () => {
    render(
      <TestAttemptForm
        attempt={{ ...IELTS_TAKEN, status: "scheduled", overall_score: null, sections: {} }}
        mode="edit"
        onChange={() => {}}
      />,
    );
    expect(screen.queryByLabelText("Overall")).not.toBeInTheDocument();
    expect(screen.getByText("Test date")).toBeInTheDocument();
  });
});

describe("ProfileTestsPanel Phase E", () => {
  it("shows attempt list and form for multiple IELTS attempts", () => {
    const attempts: TestAttempt[] = [
      IELTS_TAKEN,
      {
        ...IELTS_TAKEN,
        attempt_id: "test_a2",
        overall_score: "8.0",
        test_date: "2026-02-10",
      },
      {
        attempt_id: "test_a3",
        test_id: "ielts",
        category: "english",
        status: "scheduled",
        test_date: "2026-08-15",
        sections: {},
        linked_documents: [],
      },
    ];
    render(
      <ProfileTestsPanel
        mode="view"
        attempts={attempts}
        activeAttemptIds={{ ielts: "test_a2" }}
        activeEnglishTestId="ielts"
        selectedEnglishTestId="ielts"
        selectedAttemptId="test_a2"
      />,
    );
    expect(screen.getByTestId("attempt-list-ielts")).toBeInTheDocument();
    expect(screen.getByText("Attempt 1")).toBeInTheDocument();
    expect(screen.getByText("Attempt 3")).toBeInTheDocument();
    expect(screen.getByText(/Overall 8\.0/)).toBeInTheDocument();
  });

  it("shows Add attempt in edit mode", () => {
    render(
      <ProfileTestsPanel
        mode="edit"
        attempts={[]}
        activeAttemptIds={{}}
        activeEnglishTestId={null}
        selectedEnglishTestId="ielts"
        onAddAttempt={() => {}}
        onAttemptChange={() => {}}
      />,
    );
    expect(screen.getAllByText("Add attempt").length).toBeGreaterThanOrEqual(1);
  });
});

describe("ensureTestCatalog", () => {
  it("preserves attempts when filling compat slots", () => {
    const full = ensureFullTestCatalog({
      attempts: [IELTS_TAKEN],
      active_attempt_ids: { ielts: "test_a1" },
      active_english_test_id: "ielts",
      english: [],
      aptitude: [],
      language: [],
    });
    expect(full.attempts).toHaveLength(1);
    expect(full.english).toHaveLength(5);
  });
});
