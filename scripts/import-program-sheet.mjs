#!/usr/bin/env node
/**
 * Import partner program Excel/CSV into upi_courses_staging via upi-upsert-courses.
 * Usage:
 *   node scripts/import-program-sheet.mjs <file.xlsx> [--institute "Algonquin College"]
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) throw new Error(".env not found");
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function num(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function minBand(row, prefix, parts) {
  const vals = parts.map((p) => num(row[`${prefix} ${p}`])).filter((n) => n != null);
  return vals.length ? Math.min(...vals) : null;
}

/** @param {Record<string, unknown>} row */
export function mapProgramSheetRow(row) {
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

  const extra = {};
  for (const [k, v] of Object.entries(row)) {
    if (knownMetaKeys.has(k) || v === "" || v == null) continue;
    extra[k] = v;
  }

  return {
    course_title: title,
    campus_name: String(row["Institute Campus"] ?? row.campus_name ?? "").trim() || null,
    city: String(row.City ?? "").trim() || null,
    state_province: String(row["State / Province"] ?? "").trim() || null,
    country_name: String(row.Country ?? "").trim() || null,
    course_description: String(row["Program Description"] ?? "").trim() || null,
    program_url: String(row["Program URL"] ?? "").trim() || null,
    source_url: String(row["Program URL"] ?? "").trim() || null,
    duration_value: num(row.Year),
    duration_unit: row.Year ? "years" : null,
    application_fee: num(row["Application Fees"]),
    tuition_fee_per: String(row["Tuition Fees Type"] ?? "").trim() || null,
    currency: String(row.Country ?? "").toLowerCase() === "canada" ? "CAD" : null,
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
    confidence_score: 100,
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

function parseSheet(filePath) {
  const abs = resolve(filePath);
  const buf = readFileSync(abs);
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => !a.startsWith("--"));
  if (!fileArg) {
    console.error("Usage: node scripts/import-program-sheet.mjs <file.xlsx> [--institute \"Name\"]");
    process.exit(1);
  }
  const instituteFilter = args.includes("--institute")
    ? args[args.indexOf("--institute") + 1]
    : null;

  const filePath = resolve(process.cwd(), fileArg);
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing VITE_SUPABASE_URL or API key in .env");

  const supabase = createClient(url, key);
  const rawRows = parseSheet(filePath);
  const courses = rawRows.map(mapProgramSheetRow).filter(Boolean);
  if (!courses.length) throw new Error("No valid program rows found");

  const byInstitute = new Map();
  for (const c of courses) {
    const name = c.metadata?.institute_name || instituteFilter;
    if (!name) {
      console.error("Row missing Institute and no --institute flag:", c.course_title);
      continue;
    }
    if (instituteFilter && name.toLowerCase() !== instituteFilter.toLowerCase()) continue;
    if (!byInstitute.has(name)) byInstitute.set(name, []);
    byInstitute.get(name).push(c);
  }

  if (!byInstitute.size) throw new Error("No rows matched institute filter");

  const { data: institutions, error: instErr } = await supabase
    .from("upi_institutions")
    .select("id,name");
  if (instErr) throw instErr;

  let totalUpserted = 0;
  let totalRejected = 0;

  for (const [instName, batch] of byInstitute) {
    const inst = institutions.find(
      (i) => i.name.toLowerCase() === instName.toLowerCase(),
    );
    if (!inst) {
      console.error(`Institution not found in database: "${instName}" — create it first.`);
      totalRejected += batch.length;
      continue;
    }
    console.log(`Importing ${batch.length} programs → ${inst.name} (${inst.id})`);
    const { data, error } = await supabase.functions.invoke("upi-upsert-courses", {
      body: { courses: batch, institution_id: inst.id },
    });
    if (error) {
      console.error(`Invoke failed for ${instName}:`, error.message);
      totalRejected += batch.length;
      continue;
    }
    const upserted = data?.upserted ?? 0;
    const rejected = data?.rejected ?? 0;
    totalUpserted += upserted;
    totalRejected += rejected;
    console.log(`  upserted=${upserted} rejected=${rejected}`);
  }

  console.log("\nDone.", { totalUpserted, totalRejected, file: filePath });
  if (totalUpserted === 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
