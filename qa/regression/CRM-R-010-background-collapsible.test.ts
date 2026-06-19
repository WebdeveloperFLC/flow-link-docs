import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  educationCardPreview,
  experienceCardPreview,
  formatAttemptCardPreview,
} from "@/lib/profile/recordCardPreview";
import type { ProfileEducationRecord, ProfileExperienceRecord, TestAttempt } from "@/lib/profile/types";

/**
 * CRM-R-010 — Background details collapsible cards and preview UX.
 */
describe("CRM-R-010 background collapsible UX", () => {
  it("formatAttemptCardPreview includes status, variant, type, date and overall", () => {
    const attempt: TestAttempt = {
      attempt_id: "a1",
      test_id: "ielts",
      category: "english",
      status: "taken",
      variant: "General",
      ielts_test_type: "CBT",
      test_date: "2026-06-20",
      overall_score: "6",
      sections: {},
      linked_documents: [],
    };
    const preview = formatAttemptCardPreview(attempt);
    expect(preview).toContain("General");
    expect(preview).toContain("CBT");
    expect(preview).toContain("taken");
    expect(preview).toContain("2026-06-20");
    expect(preview).toContain("Overall: 6");
  });

  it("educationCardPreview includes level, institution, country, years and score", () => {
    const record: ProfileEducationRecord = {
      id: "e1",
      qualification_type: "bachelors",
      institution_name: "XYZ University",
      country: "India",
      start_year: "2020",
      end_year: "2023",
      grade_type: "CGPA",
      score: "8.2",
      linked_documents: [],
    };
    const preview = educationCardPreview(record, "Bachelor's Degree");
    expect(preview).toContain("Bachelor's Degree");
    expect(preview).toContain("XYZ University");
    expect(preview).toContain("India");
    expect(preview).toContain("2020 – 2023");
    expect(preview).toContain("CGPA 8.2");
  });

  it("experienceCardPreview includes company, role, type and dates", () => {
    const record: ProfileExperienceRecord = {
      id: "x1",
      company: "ABC Technologies",
      designation: "Software Developer",
      employment_type: "Full-time",
      start_date: "2023-01-01",
      end_date: null,
      currently_working: true,
      linked_documents: [],
    };
    const preview = experienceCardPreview(record);
    expect(preview).toContain("ABC Technologies");
    expect(preview).toContain("Software Developer");
    expect(preview).toContain("Full-time");
    expect(preview).toContain("Present");
  });

  it("ProfileTestsPanel uses collapsible cards not always-visible form", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/profile/ProfileTestsPanel.tsx"),
      "utf8",
    );
    expect(src).toContain("ProfileRecordCardHeader");
    expect(src).toContain("expandedAttemptId");
    expect(src).not.toContain("<TestAttemptList");
  });

  it("ProfileRecordCardHeader includes delete confirmation", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/profile/ProfileRecordCardHeader.tsx"),
      "utf8",
    );
    expect(src).toContain("Are you sure you want to delete this record?");
    expect(src).toContain("AlertDialog");
  });

  it("LeadBackgroundDetailPanel supports View Details toggle", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/leads/LeadBackgroundDetailPanel.tsx"),
      "utf8",
    );
    expect(src).toContain("View Details");
    expect(src).toContain("Hide Details");
    expect(src).toContain("CompactSummary");
  });
});
