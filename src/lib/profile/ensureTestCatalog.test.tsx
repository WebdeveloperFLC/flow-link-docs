import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileTestsPanel } from "@/components/profile/ProfileTestsPanel";
import {
  emptyEnglishTestEntry,
  ensureFullTestCatalog,
  resolveEnglishEntry,
} from "@/lib/profile/ensureTestCatalog";
import type { TestAttempt } from "@/lib/profile/types";

describe("ensureTestCatalog", () => {
  it("fills all english/aptitude/language slots for edit grid", () => {
    const full = ensureFullTestCatalog({
      active_english_test_id: null,
      english: [],
      aptitude: [],
      language: [],
    });
    expect(full.english).toHaveLength(5);
    expect(full.aptitude).toHaveLength(4);
    expect(full.language).toHaveLength(2);
  });

  it("resolveEnglishEntry returns empty scaffold in edit mode", () => {
    const entry = resolveEnglishEntry([], "ielts", "edit");
    expect(entry?.test_id).toBe("ielts");
    expect(entry?.overall).toBeNull();
  });

  it("resolveEnglishEntry returns null in view mode when sparse", () => {
    expect(resolveEnglishEntry([], "ielts", "view")).toBeNull();
  });
});

describe("ProfileTestsPanel", () => {
  it("shows edit fields when attempt card is expanded", () => {
    const attempt: TestAttempt = {
      attempt_id: "a1",
      test_id: "ielts",
      category: "english",
      status: "taken",
      variant: "Academic",
      ielts_test_type: "CBT",
      sections: {},
      linked_documents: [],
    };
    render(
      <ProfileTestsPanel
        mode="edit"
        attempts={[attempt]}
        activeAttemptIds={{ ielts: "a1" }}
        activeEnglishTestId="ielts"
        selectedEnglishTestId="ielts"
        expandedAttemptId="a1"
        onAttemptChange={() => {}}
      />,
    );
    expect(screen.getByText("IELTS variant")).toBeInTheDocument();
    expect(screen.getByText("Listening")).toBeInTheDocument();
  });

  it("shows empty hint when test type has no attempts", () => {
    render(
      <ProfileTestsPanel
        mode="view"
        attempts={[]}
        activeAttemptIds={{}}
        activeEnglishTestId={null}
        selectedEnglishTestId="pte"
      />,
    );
    expect(screen.getAllByText(/No attempts yet/).length).toBeGreaterThanOrEqual(1);
  });

  it("emptyEnglishTestEntry scaffold still works for catalog helpers", () => {
    expect(emptyEnglishTestEntry("ielts").test_id).toBe("ielts");
  });
});
