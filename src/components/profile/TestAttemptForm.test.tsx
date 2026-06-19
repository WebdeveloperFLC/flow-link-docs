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

  it("renders DET subscores for Duolingo taken in edit mode", () => {
    render(
      <TestAttemptForm
        attempt={{
          attempt_id: "test_det1",
          test_id: "duolingo",
          category: "english",
          status: "taken",
          overall_score: "125",
          test_date: "2025-11-20",
          sections: {
            literacy: "120",
            comprehension: "130",
            conversation: "125",
            production: "115",
          },
          linked_documents: [],
        }}
        mode="edit"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Literacy")).toBeInTheDocument();
    expect(screen.getByText("Comprehension")).toBeInTheDocument();
    expect(screen.getByText("Conversation")).toBeInTheDocument();
    expect(screen.getByText("Production")).toBeInTheDocument();
  });

  it("renders PTE variant and overall for taken in edit mode", () => {
    render(
      <TestAttemptForm
        attempt={{
          attempt_id: "test_pte1",
          test_id: "pte",
          category: "english",
          status: "taken",
          variant: "PTE Academic",
          overall_score: "65",
          test_date: "2025-11-20",
          sections: { listening: "60", reading: "65", writing: "62", speaking: "68" },
          linked_documents: [],
        }}
        mode="edit"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("PTE variant")).toBeInTheDocument();
    expect(screen.getByText("Overall score")).toBeInTheDocument();
    expect(screen.getByText("Listening")).toBeInTheDocument();
  });

  it("renders TOEFL variant and LRWS scores in order for taken", () => {
    render(
      <TestAttemptForm
        attempt={{
          attempt_id: "test_toefl1",
          test_id: "toefl",
          category: "english",
          status: "taken",
          variant: "TOEFL iBT",
          overall_score: "95",
          test_date: "2025-11-20",
          sections: { listening: "24", reading: "25", writing: "23", speaking: "23" },
          linked_documents: [],
        }}
        mode="edit"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("TOEFL variant")).toBeInTheDocument();
    expect(screen.getByText("Overall score")).toBeInTheDocument();
    expect(screen.getByText("Listening")).toBeInTheDocument();
    expect(screen.getByText("Reading")).toBeInTheDocument();
    expect(screen.getByText("Writing")).toBeInTheDocument();
    expect(screen.getByText("Speaking")).toBeInTheDocument();
  });

  it("renders GMAT Focus scores without IR or AWA", () => {
    render(
      <TestAttemptForm
        attempt={{
          attempt_id: "test_gmat1",
          test_id: "gmat",
          category: "aptitude",
          status: "taken",
          overall_score: "645",
          test_date: "2025-11-20",
          sections: { quant: "82", verbal: "78", data_insights: "85", ir: "6", awa: "5" },
          linked_documents: [],
        }}
        mode="edit"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Overall score")).toBeInTheDocument();
    expect(screen.getByText("Quant")).toBeInTheDocument();
    expect(screen.getByText("Verbal")).toBeInTheDocument();
    expect(screen.getByText("Data Insights")).toBeInTheDocument();
    expect(screen.queryByText("IR")).not.toBeInTheDocument();
    expect(screen.queryByText("AWA")).not.toBeInTheDocument();
  });

  it("keeps IELTS variant editable when status is not_taken", () => {
    render(
      <TestAttemptForm
        attempt={{
          ...IELTS_TAKEN,
          status: "not_taken",
          variant: "General",
        }}
        mode="edit"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("IELTS variant")).toBeInTheDocument();
    expect(screen.getByText("Listening")).toBeInTheDocument();
    expect(screen.getByText("Overall score")).toBeInTheDocument();
  });

  it("shows CEFR in view when set", () => {
    render(
      <TestAttemptForm
        attempt={{
          attempt_id: "test_de1",
          test_id: "german",
          category: "language",
          status: "taken",
          exam_type: "Goethe",
          cefr_level: "B2",
          overall_score: "B2",
          sections: {},
          linked_documents: [],
        }}
        mode="view"
      />,
    );
    expect(screen.getByText(/CEFR B2/)).toBeInTheDocument();
  });

  it("shows exam type select for language in edit mode", () => {
    render(
      <TestAttemptForm
        attempt={{
          attempt_id: "test_de1",
          test_id: "german",
          category: "language",
          status: "scheduled",
          exam_type: "Goethe",
          test_date: "2026-06-27",
          sections: {},
          linked_documents: [],
        }}
        mode="edit"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Exam type")).toBeInTheDocument();
    expect(screen.getByText("CEFR level")).toBeInTheDocument();
  });

  it("hides overall when status is scheduled and no stored scores", () => {
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
