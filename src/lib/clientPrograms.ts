import { supabase } from "@/integrations/supabase/client";
import { appendTimeline } from "@/lib/timeline";

export type ClientProgramStatus = "shortlisted" | "final";

export type ClientProgramRow = {
  id: string;
  client_id: string;
  course_id: string;
  country_code: string;
  status: ClientProgramStatus;
  is_primary: boolean;
  notes: string | null;
  shortlisted_by: string | null;
  shortlisted_at: string;
  finalized_by: string | null;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CfCourseSummary = {
  id: string;
  name: string;
  study_level: string;
  field_of_study: string;
  intake_months: string[];
  intake_year: number | null;
  tuition_fee: number | null;
  currency: string | null;
  university: {
    id: string;
    name: string;
    city: string | null;
    country_code: string;
  };
  country: {
    code: string;
    name: string;
    flag_emoji: string | null;
  };
};

export type ClientProgramEnriched = ClientProgramRow & {
  course: CfCourseSummary;
};

const PROGRAM_SELECT = `
  *,
  course:cf_courses (
    id,
    name,
    study_level,
    field_of_study,
    intake_months,
    intake_year,
    tuition_fee,
    currency,
    university:cf_universities (
      id,
      name,
      city,
      country_code,
      country:cf_countries (
        code,
        name,
        flag_emoji
      )
    )
  )
`;

const programsTable = () => supabase.from("cf_client_programs");

function mapEnriched(row: Record<string, unknown>): ClientProgramEnriched {
  const courseRaw = row.course as Record<string, unknown>;
  const uniRaw = courseRaw.university as Record<string, unknown>;
  const countryRaw = uniRaw.country as Record<string, unknown>;
  return {
    ...(row as unknown as ClientProgramRow),
    course: {
      id: courseRaw.id as string,
      name: courseRaw.name as string,
      study_level: courseRaw.study_level as string,
      field_of_study: courseRaw.field_of_study as string,
      intake_months: (courseRaw.intake_months as string[]) ?? [],
      intake_year: (courseRaw.intake_year as number | null) ?? null,
      tuition_fee: (courseRaw.tuition_fee as number | null) ?? null,
      currency: (courseRaw.currency as string | null) ?? null,
      university: {
        id: uniRaw.id as string,
        name: uniRaw.name as string,
        city: (uniRaw.city as string | null) ?? null,
        country_code: uniRaw.country_code as string,
      },
      country: {
        code: countryRaw.code as string,
        name: countryRaw.name as string,
        flag_emoji: (countryRaw.flag_emoji as string | null) ?? null,
      },
    },
  };
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user?.id) throw new Error("Sign in required");
  return data.user.id;
}

async function fetchCourseCountryCode(courseId: string): Promise<string> {
  const { data, error } = await supabase
    .from("cf_courses")
    .select("university:cf_universities(country_code)")
    .eq("id", courseId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Course not found");
  const uni = data.university as { country_code: string } | null;
  if (!uni?.country_code) throw new Error("Course has no country");
  return uni.country_code;
}

function programLabel(course: CfCourseSummary): string {
  return `${course.university.name} — ${course.name}`;
}

/** Append a country to interested_countries on clients + client_profile if missing. */
async function ensureClientInterestedCountry(clientId: string, countryName: string): Promise<boolean> {
  const trimmed = countryName.trim();
  if (!trimmed) return false;

  const { data: clientRow, error: fetchErr } = await supabase
    .from("clients")
    .select("interested_countries")
    .eq("id", clientId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  const current = ((clientRow as { interested_countries?: string[] | null })?.interested_countries ?? []) as string[];
  if (current.some((c) => c.trim().toLowerCase() === trimmed.toLowerCase())) {
    return false;
  }

  const next = [...current, trimmed];

  const { error: clientUpdErr } = await supabase
    .from("clients")
    .update({ interested_countries: next } as never)
    .eq("id", clientId);
  if (clientUpdErr) throw clientUpdErr;

  const { data: prof } = await supabase
    .from("client_profile")
    .select("client_id")
    .eq("client_id", clientId)
    .maybeSingle();

  if (prof) {
    const { error: profUpdErr } = await supabase
      .from("client_profile")
      .update({ interested_countries: next } as never)
      .eq("client_id", clientId);
    if (profUpdErr) throw profUpdErr;
  } else {
    const { error: profInsErr } = await supabase
      .from("client_profile")
      .insert({ client_id: clientId, interested_countries: next } as never);
    if (profInsErr) throw profInsErr;
  }

  return true;
}

/** List programs for a client, optionally filtered by status. */
export async function listClientPrograms(
  clientId: string,
  status?: ClientProgramStatus,
): Promise<ClientProgramEnriched[]> {
  let q = programsTable()
    .select(PROGRAM_SELECT)
    .eq("client_id", clientId)
    .order("country_code")
    .order("status")
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapEnriched);
}

/** Add a course to the client's shortlist (idempotent if already shortlisted). */
export async function shortlistCourseForClient(
  clientId: string,
  courseId: string,
  notes?: string | null,
): Promise<ClientProgramEnriched> {
  const userId = await currentUserId();
  const countryCode = await fetchCourseCountryCode(courseId);

  const { data: existing, error: exErr } = await programsTable()
    .select(PROGRAM_SELECT)
    .eq("client_id", clientId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (exErr) throw exErr;

  if (existing) {
    const row = mapEnriched(existing as Record<string, unknown>);
    if (row.status === "final") {
      throw new Error("This course is already finalized on the client file");
    }
    return row;
  }

  const { data, error } = await programsTable()
    .insert({
      client_id: clientId,
      course_id: courseId,
      country_code: countryCode,
      status: "shortlisted",
      notes: notes ?? null,
      shortlisted_by: userId,
    } as never)
    .select(PROGRAM_SELECT)
    .single();
  if (error) throw error;

  const enriched = mapEnriched(data as Record<string, unknown>);
  await appendTimeline({
    clientId,
    eventType: "program_shortlisted",
    summary: `Shortlisted program: ${programLabel(enriched.course)}`,
    metadata: {
      program_id: enriched.id,
      course_id: courseId,
      country_code: countryCode,
    },
    isStaffOnly: true,
  });
  return enriched;
}

/** Move a shortlisted program to final (permanent). */
export async function finalizeClientProgram(
  programId: string,
  opts?: { setPrimary?: boolean },
): Promise<ClientProgramEnriched> {
  const userId = await currentUserId();

  const { data: row, error: fetchErr } = await programsTable()
    .select(PROGRAM_SELECT)
    .eq("id", programId)
    .single();
  if (fetchErr) throw fetchErr;

  const current = mapEnriched(row as Record<string, unknown>);
  if (current.status === "final") return current;
  if (current.status !== "shortlisted") {
    throw new Error("Only shortlisted programs can be finalized");
  }

  const { count: primaryCount } = await programsTable()
    .select("id", { count: "exact", head: true })
    .eq("client_id", current.client_id)
    .eq("country_code", current.country_code)
    .eq("status", "final")
    .eq("is_primary", true);

  const makePrimary = opts?.setPrimary ?? (primaryCount ?? 0) === 0;

  if (makePrimary) {
    await programsTable()
      .update({ is_primary: false } as never)
      .eq("client_id", current.client_id)
      .eq("country_code", current.country_code)
      .eq("status", "final")
      .eq("is_primary", true);
  }

  const { data: updated, error: updErr } = await programsTable()
    .update({
      status: "final",
      finalized_by: userId,
      finalized_at: new Date().toISOString(),
      is_primary: makePrimary,
    } as never)
    .eq("id", programId)
    .select(PROGRAM_SELECT)
    .single();
  if (updErr) throw updErr;

  const enriched = mapEnriched(updated as Record<string, unknown>);

  await ensureClientInterestedCountry(current.client_id, enriched.course.country.name);

  if (makePrimary) {
    await syncClientPrimaryFromProgram(enriched);
  }

  await appendTimeline({
    clientId: current.client_id,
    eventType: "program_finalized",
    summary: `Finalized program: ${programLabel(enriched.course)}`,
    metadata: {
      program_id: programId,
      course_id: enriched.course_id,
      country_code: enriched.country_code,
      is_primary: makePrimary,
    },
    isStaffOnly: true,
  });

  return enriched;
}

/** Remove a shortlisted program (cannot remove final except via admin RLS). */
export async function removeShortlistedProgram(programId: string): Promise<void> {
  const { data: row, error: fetchErr } = await programsTable()
    .select("id, client_id, status, course:cf_courses(name, university:cf_universities(name))")
    .eq("id", programId)
    .single();
  if (fetchErr) throw fetchErr;

  const r = row as {
    id: string;
    client_id: string;
    status: string;
    course: { name: string; university: { name: string } };
  };
  if (r.status !== "shortlisted") {
    throw new Error("Only shortlisted programs can be removed");
  }

  const { error } = await programsTable().delete().eq("id", programId);
  if (error) throw error;

  await appendTimeline({
    clientId: r.client_id,
    eventType: "program_shortlist_removed",
    summary: `Removed shortlist: ${r.course.university.name} — ${r.course.name}`,
    metadata: { program_id: programId },
    isStaffOnly: true,
  });
}

/** Set a final program as primary for its country and sync client summary fields. */
export async function setPrimaryClientProgram(programId: string): Promise<ClientProgramEnriched> {
  const { data: row, error: fetchErr } = await programsTable()
    .select(PROGRAM_SELECT)
    .eq("id", programId)
    .single();
  if (fetchErr) throw fetchErr;

  const current = mapEnriched(row as Record<string, unknown>);
  if (current.status !== "final") {
    throw new Error("Only finalized programs can be set as primary");
  }

  await programsTable()
    .update({ is_primary: false } as never)
    .eq("client_id", current.client_id)
    .eq("country_code", current.country_code)
    .eq("status", "final")
    .eq("is_primary", true);

  const { data: updated, error: updErr } = await programsTable()
    .update({ is_primary: true } as never)
    .eq("id", programId)
    .select(PROGRAM_SELECT)
    .single();
  if (updErr) throw updErr;

  const enriched = mapEnriched(updated as Record<string, unknown>);
  await syncClientPrimaryFromProgram(enriched);

  await appendTimeline({
    clientId: current.client_id,
    eventType: "program_primary_set",
    summary: `Primary program for ${enriched.course.country.name}: ${programLabel(enriched.course)}`,
    metadata: {
      program_id: programId,
      country_code: enriched.country_code,
    },
    isStaffOnly: true,
  });

  return enriched;
}

/** Update clients.interested_country / interested_course from the primary final program. */
export async function syncClientPrimaryFromProgram(program: ClientProgramEnriched): Promise<void> {
  if (!program.is_primary || program.status !== "final") return;

  const { error } = await supabase
    .from("clients")
    .update({
      interested_country: program.course.country.name,
      interested_course: programLabel(program.course),
    } as never)
    .eq("id", program.client_id);
  if (error) throw error;
}

/** Re-sync client summary from the current primary final row for a country (or first primary). */
export async function syncClientPrimaryFields(
  clientId: string,
  countryCode?: string,
): Promise<void> {
  let q = programsTable()
    .select(PROGRAM_SELECT)
    .eq("client_id", clientId)
    .eq("status", "final")
    .eq("is_primary", true);
  if (countryCode) q = q.eq("country_code", countryCode);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  if (!data) return;
  await syncClientPrimaryFromProgram(mapEnriched(data as Record<string, unknown>));
}

/** Check if a course is already attached to a client (any status). */
export async function getClientProgramForCourse(
  clientId: string,
  courseId: string,
): Promise<ClientProgramEnriched | null> {
  const { data, error } = await programsTable()
    .select(PROGRAM_SELECT)
    .eq("client_id", clientId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapEnriched(data as Record<string, unknown>);
}

/** Group enriched programs by country code for UI sections. */
export function groupProgramsByCountry(
  programs: ClientProgramEnriched[],
): Map<
  string,
  { country: CfCourseSummary["country"]; shortlisted: ClientProgramEnriched[]; final: ClientProgramEnriched[] }
> {
  const map = new Map<
    string,
    { country: CfCourseSummary["country"]; shortlisted: ClientProgramEnriched[]; final: ClientProgramEnriched[] }
  >();
  for (const p of programs) {
    const key = p.country_code;
    if (!map.has(key)) {
      map.set(key, { country: p.course.country, shortlisted: [], final: [] });
    }
    const bucket = map.get(key)!;
    if (p.status === "shortlisted") bucket.shortlisted.push(p);
    else bucket.final.push(p);
  }
  return map;
}
