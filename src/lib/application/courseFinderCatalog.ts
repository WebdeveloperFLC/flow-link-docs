import { supabase } from "@/integrations/supabase/client";
import { formatSupabaseError } from "@/lib/formatSupabaseError";

export type CourseFinderInstitutionOption = {
  id: string;
  name: string;
  countryName: string | null;
};

export type CourseFinderCourseOption = {
  id: string;
  name: string;
  studyLevel: string;
  fieldOfStudy: string;
  durationMonths: number | null;
  tuitionFee: number | null;
  currency: string | null;
  intakeMonths: string[];
  intakeYear: number | null;
  programCode: string | null;
  campusNames: string[];
  countryName: string | null;
  countryCode: string | null;
  universityName: string | null;
};

export function buildIntakeTermOptions(course: {
  intakeMonths: string[];
  intakeYear: number | null;
}): string[] {
  const suggestions = (course.intakeMonths ?? []).map((month) =>
    course.intakeYear ? `${month} ${course.intakeYear}` : month,
  );
  return [...new Set(suggestions.filter(Boolean))].sort();
}

export function snapshotFieldsFromCourse(
  course: CourseFinderCourseOption,
  options?: { campusName?: string | null; intakeTerm?: string | null },
) {
  const intakeOptions = buildIntakeTermOptions(course);
  const campus =
    options?.campusName?.trim() ||
    course.campusNames[0]?.trim() ||
    null;
  const intakeTerm = options?.intakeTerm?.trim() || intakeOptions[0] || "";

  return {
    cfCourseId: course.id,
    programName: course.name,
    programCode: course.programCode,
    campusName: campus,
    destinationCountry: course.countryName,
    studyLevel: course.studyLevel,
    durationMonths: course.durationMonths,
    tuitionFee: course.tuitionFee,
    tuitionCurrency: course.currency,
    intakeTerm,
    intakeYear: course.intakeYear,
  };
}

function mapCourseRow(row: Record<string, unknown>): CourseFinderCourseOption {
  const university = row.university as Record<string, unknown> | null | undefined;
  const country = university?.country as Record<string, unknown> | null | undefined;
  return {
    id: row.id as string,
    name: row.name as string,
    studyLevel: row.study_level as string,
    fieldOfStudy: row.field_of_study as string,
    durationMonths: row.duration_months != null ? Number(row.duration_months) : null,
    tuitionFee: row.tuition_fee != null ? Number(row.tuition_fee) : null,
    currency: (row.currency as string | null) ?? null,
    intakeMonths: (row.intake_months as string[] | null) ?? [],
    intakeYear: row.intake_year != null ? Number(row.intake_year) : null,
    programCode: (row.program_code as string | null) ?? null,
    campusNames: (row.campus_names as string[] | null) ?? [],
    countryName: (country?.name as string | null) ?? null,
    countryCode: (country?.code as string | null) ?? null,
    universityName: (university?.name as string | null) ?? null,
  };
}

export async function fetchCourseFinderInstitutions(): Promise<CourseFinderInstitutionOption[]> {
  const { data, error } = await supabase
    .from("cf_universities")
    .select("upi_institution_id, institution:upi_institutions(id, name, country_name)")
    .not("upi_institution_id", "is", null)
    .order("name");

  if (error) throw new Error(formatSupabaseError(error, "Could not load institutions"));

  const byId = new Map<string, CourseFinderInstitutionOption>();
  for (const row of data ?? []) {
    const institution = row.institution as Record<string, unknown> | null | undefined;
    const id = (institution?.id as string | undefined) ?? (row.upi_institution_id as string | undefined);
    if (!id || byId.has(id)) continue;
    byId.set(id, {
      id,
      name: (institution?.name as string | undefined) ?? "Institution",
      countryName: (institution?.country_name as string | null) ?? null,
    });
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchCourseFinderCoursesForInstitution(
  institutionId: string,
): Promise<CourseFinderCourseOption[]> {
  const { data: universities, error: uniError } = await supabase
    .from("cf_universities")
    .select("id")
    .eq("upi_institution_id", institutionId);

  if (uniError) throw new Error(formatSupabaseError(uniError, "Could not load institution programs"));

  const universityIds = (universities ?? []).map((row) => row.id as string);
  if (universityIds.length === 0) return [];

  const { data, error } = await supabase
    .from("cf_courses")
    .select(
      `
      id,
      name,
      study_level,
      field_of_study,
      duration_months,
      tuition_fee,
      currency,
      intake_months,
      intake_year,
      program_code,
      campus_names,
      university:cf_universities (
        name,
        country:cf_countries (
          code,
          name
        )
      )
    `,
    )
    .in("university_id", universityIds)
    .order("name");

  if (error) throw new Error(formatSupabaseError(error, "Could not load programs"));

  return ((data ?? []) as Record<string, unknown>[]).map(mapCourseRow);
}

export async function fetchCourseFinderCourseById(
  courseId: string,
): Promise<CourseFinderCourseOption | null> {
  const { data, error } = await supabase
    .from("cf_courses")
    .select(
      `
      id,
      name,
      study_level,
      field_of_study,
      duration_months,
      tuition_fee,
      currency,
      intake_months,
      intake_year,
      program_code,
      campus_names,
      university:cf_universities (
        name,
        country:cf_countries (
          code,
          name
        )
      )
    `,
    )
    .eq("id", courseId)
    .maybeSingle();

  if (error) throw new Error(formatSupabaseError(error, "Could not load program"));
  if (!data) return null;
  return mapCourseRow(data as Record<string, unknown>);
}
