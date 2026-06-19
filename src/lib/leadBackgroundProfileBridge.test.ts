import { describe, expect, it } from "vitest";
import {
  applyEducationRecordsToLeadBackground,
  applyExperienceRecordsToLeadBackground,
  applyTestsPatchToLeadBackground,
  educationRecordsFromLeadBackground,
  experienceRecordsFromLeadBackground,
  testsStateFromLeadBackground,
} from "@/lib/leadBackgroundProfileBridge";
import { buildEducationDetailView, leadToBackgroundState } from "@/lib/leadBackground";
import { createEmptyAttempt } from "@/lib/profile/testAttempts";
import { ensureEducationId } from "@/lib/profile/profileRecordIds";
import type { ProfileEducationRecord } from "@/lib/profile/types";

const EXTENDED_EDUCATION: ProfileEducationRecord = {
  id: "edu_test_1",
  qualification_type: "Bachelor's",
  institution_name: "Test University",
  country: "India",
  state_province: "Maharashtra",
  city: "Mumbai",
  field_of_study: "Information Technology",
  major: "Computer Science",
  start_year: "2021",
  end_year: "2025",
  status: "Completed",
  grade_type: "CGPA",
  score: "8.5",
  backlogs: "0",
  notes: "Test Education Note",
  linked_documents: [],
};

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

  it("round-trips extended education fields without collapsing major into field of study", () => {
    const bg = leadToBackgroundState({ education_history: [] } as never);
    const saved = applyEducationRecordsToLeadBackground(bg, [EXTENDED_EDUCATION]);
    const row = saved.education_history[0]!;

    expect(row.specialization).toBe("Information Technology");
    expect(row.field_of_study).toBe("Information Technology");
    expect(row.major).toBe("Computer Science");
    expect(row.start_year).toBe("2021");
    expect(row.end_year).toBe("2025");
    expect(row.year).toBe("2025");
    expect(row.status).toBe("Completed");
    expect(row.grade_type).toBe("CGPA");
    expect(row.score).toBe("8.5");
    expect(row.percentage_cgpa).toBe("8.5");
    expect(row.backlogs).toBe("0");
    expect(row.notes).toBe("Test Education Note");

    const records = educationRecordsFromLeadBackground(saved);
    expect(records[0]).toMatchObject({
      field_of_study: "Information Technology",
      major: "Computer Science",
      start_year: "2021",
      end_year: "2025",
      status: "Completed",
      grade_type: "CGPA",
      score: "8.5",
      backlogs: "0",
      notes: "Test Education Note",
    });
  });

  it("reads extended fields from stored education_history JSON (backward compatible aliases)", () => {
    const bg = leadToBackgroundState({
      education_history: [
        {
          id: "edu_legacy",
          level: "Master's",
          institution: "Old College",
          specialization: "Physics",
          major: "Computer Science",
          start_year: "2021",
          end_year: "2025",
          year: "2025",
          status: "Completed",
          grade_type: "CGPA",
          percentage_cgpa: "9.0",
          backlogs: "0",
          notes: "Test Education Note",
        },
      ],
    } as never);
    const record = educationRecordsFromLeadBackground(bg)[0]!;
    expect(record.qualification_type).toBe("Master's");
    expect(record.institution_name).toBe("Old College");
    expect(record.field_of_study).toBe("Physics");
    expect(record.major).toBe("Computer Science");
    expect(record.start_year).toBe("2021");
    expect(record.end_year).toBe("2025");
    expect(record.status).toBe("Completed");
    expect(record.grade_type).toBe("CGPA");
    expect(record.score).toBe("9.0");
    expect(record.backlogs).toBe("0");
    expect(record.notes).toBe("Test Education Note");
  });

  it("buildEducationDetailView shows extended fields in summary", () => {
    const view = buildEducationDetailView({
      level: "Bachelor's",
      institution: "Test University",
      field_of_study: "Information Technology",
      major: "Computer Science",
      start_year: "2021",
      end_year: "2025",
      status: "Completed",
      grade_type: "CGPA",
      score: "8.5",
      backlogs: "0",
      notes: "Test Education Note",
      city: "Mumbai",
      state_province: "Maharashtra",
      country: "India",
    });
    expect(view.details).toContain("Test University");
    expect(view.details).toContain("Information Technology");
    expect(view.details).toContain("Major: Computer Science");
    expect(view.details).toContain("2021–2025");
    expect(view.details).toContain("Status: Completed");
    expect(view.details).toContain("Grade: CGPA");
    expect(view.details).toContain("Backlogs: 0");
    expect(view.details).toContain("Test Education Note");
    expect(view.location).toBe("Mumbai, Maharashtra, India");
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

  it("round-trips experience department and employment type on lead background", () => {
    const bg = leadToBackgroundState({
      work_experience: [
        {
          company: "ABC limited",
          role: "manager",
          department: "Operations",
          employment_type: "Full-time",
        },
      ],
    } as never);
    const records = experienceRecordsFromLeadBackground(bg);
    expect(records[0]?.department).toBe("Operations");
    expect(records[0]?.employment_type).toBe("Full-time");

    const patched = applyExperienceRecordsToLeadBackground(bg, [
      {
        ...records[0]!,
        department: "Sales",
        employment_type: "Contract",
      },
    ]);
    const roundTrip = experienceRecordsFromLeadBackground(patched);
    expect(roundTrip[0]?.department).toBe("Sales");
    expect(roundTrip[0]?.employment_type).toBe("Contract");
    expect(patched.work_experience[0]?.department).toBe("Sales");
  });
});
