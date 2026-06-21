import type { ApplicationLifecycleStatus, ApplicationSource } from "./types";

export type ApplicationDuplicateMatch = {
  applicationId: string;
  status: ApplicationLifecycleStatus;
  programName: string | null;
  campusName: string | null;
  intakeTerm: string;
  institutionId: string;
  institutionName: string | null;
  clientServiceCaseId: string;
  applicationSource: ApplicationSource | null;
  createdAt: string;
};

export function normalizeApplicationMatchField(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function applicationDuplicateKey(input: {
  institutionId: string;
  programName?: string | null;
  campusName?: string | null;
  intakeTerm: string;
}): string {
  return [
    input.institutionId,
    normalizeApplicationMatchField(input.programName),
    normalizeApplicationMatchField(input.campusName),
    normalizeApplicationMatchField(input.intakeTerm),
  ].join("|");
}

export function mapDuplicateMatchRow(row: Record<string, unknown>): ApplicationDuplicateMatch {
  return {
    applicationId: row.qualification_id as string,
    status: row.status as ApplicationLifecycleStatus,
    programName: (row.program_name as string | null) ?? null,
    campusName: (row.campus_name as string | null) ?? null,
    intakeTerm: row.intake_term as string,
    institutionId: row.institution_id as string,
    institutionName: (row.institution_name as string | null) ?? null,
    clientServiceCaseId: row.client_service_case_id as string,
    applicationSource: (row.application_source as ApplicationSource | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export function formatApplicationDuplicateMessage(match: ApplicationDuplicateMatch): string {
  const program = match.programName?.trim() || "Unnamed program";
  const campus = match.campusName?.trim() ? ` · ${match.campusName.trim()}` : "";
  const institution = match.institutionName?.trim() || "Institution";
  return `An active application already exists for ${institution} — ${program}${campus} (${match.intakeTerm}, status ${match.status}).`;
}
