import * as XLSX from "xlsx";

function num(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function minBand(row: Record<string, unknown>, prefix: string, parts: string[]): number | null {
  const vals = parts.map((p) => num(row[`${prefix} ${p}`])).filter((n): n is number => n != null);
  return vals.length ? Math.min(...vals) : null;
}

/** Map one partner program sheet row → upi-upsert-courses payload. */
export function mapProgramSheetRow(row: Record<string, unknown>) {
  const title = String(row.Name ?? row["Program Name"] ?? row.course_title ?? "").trim();
  if (!title) return null;

  const intakeRaw = String(row["Course Intake"] ?? "").trim();
  const intake_months = intakeRaw
    ? intakeRaw.split(/[,;/|]+/).map((s) => s.trim()).filter(Boolean)
    : [];

  const knownMetaKeys = new Set([
    "Institute", "Name", "Institute Campus", "City", "Country", "State / Province",
    "Program Level", "Program URL", "Application URL Link", "Program Description",
    "Year", "Course Intake", "Application Fees", "Tuition Fees Type",
  ]);

  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (knownMetaKeys.has(k) || v === "" || v == null) continue;
    extra[k] = v;
  }

  const country = String(row.Country ?? "").trim();

  return {
    course_title: title,
    campus_name: String(row["Institute Campus"] ?? row.campus_name ?? "").trim() || null,
    city: String(row.City ?? "").trim() || null,
    state_province: String(row["State / Province"] ?? "").trim() || null,
    country_name: country || null,
    course_description: String(row["Program Description"] ?? "").trim() || null,
    program_url: String(row["Program URL"] ?? "").trim() || null,
    source_url: String(row["Program URL"] ?? "").trim() || null,
    duration_value: num(row.Year),
    duration_unit: row.Year ? "years" : null,
    application_fee: num(row["Application Fees"]),
    tuition_fee_per: String(row["Tuition Fees Type"] ?? "").trim() || null,
    currency: country.toLowerCase() === "canada" ? "CAD" : null,
    intake_months,
    ielts_overall: num(row["IELTS Overall Score"]),
    ielts_min_component: minBand(row, "IELTS", ["Listening", "Reading", "Speaking", "Writing"]),
    pte_overall: num(row["PTE Overall Score"]),
    toefl_overall: num(row["TOEFL Overall Score"]),
    duolingo_overall: num(row["Duolingo Overall Score"]),
    gpa_requirement: row["CGPA Score"]
      ? String(row["CGPA Score"])
      : row["Percentage Score"]
        ? `${row["Percentage Score"]}%`
        : null,
    confidence_score: 95,
    program_level: String(row["Program Level"] ?? "").trim() || undefined,
    is_online: String(row["Program Delivery Mode"] ?? "").toLowerCase().includes("online"),
    metadata: {
      program_level: String(row["Program Level"] ?? "").trim() || null,
      field_of_study: String(row["Discipline Area"] ?? row["Study Area"] ?? "").trim() || null,
      study_area: String(row["Study Area"] ?? "").trim() || null,
      discipline_area: String(row["Discipline Area"] ?? "").trim() || null,
      apply_url: String(row["Application URL Link"] ?? "").trim() || null,
      program_code: String(row["Program Code"] ?? "").trim() || null,
      program_type: String(row["Program Type"] ?? "").trim() || null,
      program_delivery_mode: String(row["Program Delivery Mode"] ?? "").trim() || null,
      program_language: String(row["Program Language"] ?? "").trim() || null,
      competitiveness: String(row["Competitiveness"] ?? "").trim() || null,
      conditional_acceptance: String(row["Conditional Acceptance"] ?? "").trim() || null,
      backlogs_allowed: num(row["Number Of Backlogs"]) ?? row["Number Of Backlogs"] ?? null,
      monthly_living_cost: String(row["Monthly Living Cost"] ?? "").trim() || null,
      tuition_fees_type: String(row["Tuition Fees Type"] ?? "").trim() || null,
      import_source: "program_sheet_xlsx",
      institute_name: String(row.Institute ?? "").trim() || null,
      ...extra,
    },
  };
}

export function parseProgramSheetFile(buffer: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
}

export type ParsedImportBatch = {
  instituteName: string;
  courses: NonNullable<ReturnType<typeof mapProgramSheetRow>>[];
};

/** Group parsed rows by Institute column; skip empty titles. */
export function groupProgramSheetRows(rows: Record<string, unknown>[]): ParsedImportBatch[] {
  const map = new Map<string, NonNullable<ReturnType<typeof mapProgramSheetRow>>[]>();
  for (const row of rows) {
    const mapped = mapProgramSheetRow(row);
    if (!mapped) continue;
    const name = String(mapped.metadata?.institute_name ?? "").trim() || "Unknown";
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(mapped);
  }
  return Array.from(map.entries()).map(([instituteName, courses]) => ({ instituteName, courses }));
}

export function matchInstitutionId(
  name: string,
  institutions: { id: string; name: string }[],
): string | null {
  const norm = name.toLowerCase().trim();
  const exact = institutions.find((i) => i.name.toLowerCase().trim() === norm);
  if (exact) return exact.id;
  const partial = institutions.find(
    (i) => i.name.toLowerCase().includes(norm) || norm.includes(i.name.toLowerCase()),
  );
  return partial?.id ?? null;
}
