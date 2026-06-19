import {
  formatActiveAttemptHighlight,
  formatActiveAttemptLine,
  listActiveAttemptsForSummary,
} from "@/lib/profile/testAttemptSummary";
import type { ProfileSectionId, ProfileSectionSummary, ProfileViewModel } from "@/lib/profile/types";

function filled(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  return s.length ? s : null;
}

function line(label: string, value: string | null | undefined): string | null {
  const v = filled(value);
  return v ? `${label}: ${v}` : null;
}

function capLines(lines: string[], max: number): string[] {
  return lines.filter(Boolean).slice(0, max) as string[];
}

export function summarizeProfileSection(vm: ProfileViewModel, section: ProfileSectionId): ProfileSectionSummary {
  switch (section) {
    case "identity": {
      const lines = capLines(
        [
          line("DOB", vm.identity.date_of_birth),
          line("Nationality", vm.identity.nationality),
          line("Passport", vm.identity.passport_number),
          line("Marital", vm.identity.marital_status),
        ],
        4,
      );
      const headline = filled(vm.identity.full_name) ?? "Identity";
      return { section, headline, lines };
    }
    case "contact": {
      const lines = capLines(
        [
          line("Phone", vm.contact.phone_primary ?? vm.contact.phone_alt),
          line("Email", vm.contact.email_primary ?? vm.contact.email_alt),
          line("City", vm.contact.address_city),
          line("Country", vm.contact.address_country),
        ],
        4,
      );
      return { section, headline: "Contact & address", lines };
    }
    case "tests": {
      const lines = listActiveAttemptsForSummary(vm.tests).map(formatActiveAttemptLine);
      return { section, headline: "Tests", lines: capLines(lines, 5) };
    }
    case "education": {
      const first = vm.education[0];
      const lines = first
        ? capLines(
            [
              line("Qualification", first.qualification_type),
              line("Institution", first.institution_name),
              line("Year", first.end_year),
              line("Score", first.score),
            ],
            4,
          )
        : ["No education records"];
      const extra = vm.education.length > 1 ? [`+${vm.education.length - 1} more`] : [];
      return { section, headline: "Education", lines: [...lines, ...extra].slice(0, 5) };
    }
    case "experience": {
      const first = vm.experience[0];
      const lines = first
        ? capLines(
            [
              line("Company", first.company),
              line("Role", first.designation),
              line("Since", first.start_date),
              first.currently_working ? "Currently working" : line("Until", first.end_date),
            ].filter((x): x is string => !!x),
            4,
          )
        : ["No experience records"];
      const extra = vm.experience.length > 1 ? [`+${vm.experience.length - 1} more`] : [];
      return { section, headline: "Experience", lines: [...lines, ...extra].slice(0, 5) };
    }
  }
}

export interface Client360ProfileSummary {
  sections: ProfileSectionSummary[];
  highlights: string[];
}

const MAX_360_LINES_PER_SECTION = 3;

/**
 * Executive summary for Client 360 profile block — read-only, capped lines.
 */
export function summarizeProfileFor360(vm: ProfileViewModel): Client360ProfileSummary {
  const sectionIds: ProfileSectionId[] = ["identity", "contact", "tests", "education", "experience"];
  const sections = sectionIds.map((id) => {
    const s = summarizeProfileSection(vm, id);
    return { ...s, lines: s.lines.slice(0, MAX_360_LINES_PER_SECTION) };
  });

  const highlights: string[] = [];
  const name = filled(vm.identity.full_name);
  if (name) highlights.push(name);
  const activeEnglish = vm.tests.active_english_test_id
    ? listActiveAttemptsForSummary(vm.tests).find((a) => a.test_id === vm.tests.active_english_test_id)
    : null;
  const scoreHighlight = activeEnglish ? formatActiveAttemptHighlight(activeEnglish) : null;
  if (scoreHighlight) highlights.push(scoreHighlight);
  if (vm.education[0]?.qualification_type) highlights.push(vm.education[0].qualification_type);
  if (vm.experience[0]?.company) highlights.push(vm.experience[0].company);

  return { sections, highlights: highlights.slice(0, 7) };
}

export function summarizeProfile(vm: ProfileViewModel): ProfileSectionSummary[] {
  return (["identity", "contact", "tests", "education", "experience"] as ProfileSectionId[]).map((s) =>
    summarizeProfileSection(vm, s),
  );
}
