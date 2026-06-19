import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileTestsPanel } from "@/components/profile/ProfileTestsPanel";
import {
  emptyEnglishTestEntry,
  ensureFullTestCatalog,
  resolveEnglishEntry,
} from "@/lib/profile/ensureTestCatalog";

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
  it("shows edit block for selected english test even when VM is sparse", () => {
    render(
      <ProfileTestsPanel
        mode="edit"
        activeEnglishTestId={null}
        english={[emptyEnglishTestEntry("ielts")]}
        aptitude={[]}
        language={[]}
        selectedEnglishTestId="ielts"
        onEnglishChange={() => {}}
      />,
    );
    expect(screen.getByText("IELTS variant")).toBeInTheDocument();
    expect(screen.getByText("Overall")).toBeInTheDocument();
  });

  it("shows empty hint in view mode when test has no data", () => {
    render(
      <ProfileTestsPanel
        mode="view"
        activeEnglishTestId={null}
        english={[]}
        aptitude={[]}
        language={[]}
        selectedEnglishTestId="pte"
      />,
    );
    expect(screen.getByText(/No details captured for PTE yet/)).toBeInTheDocument();
  });
});
