#!/usr/bin/env node
/**
 * Generate supabase/migrations/20260606290000_seed_canada_extended_metadata.sql
 * from content/service-library/canada-*.json files.
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "content/service-library");
const OUT = path.join(process.cwd(), "supabase/migrations/20260606290000_seed_canada_extended_metadata.sql");

const CANADA_IDS = {
  "canada-student-visa.json": "c35e6051-f40f-47bf-9cac-0a386c47a336",
  "canada-visitor-visa.json": "b2000001-0001-4000-8000-000000000011",
  "canada-spouse-visa.json": "b2000001-0001-4000-8000-000000000012",
  "canada-express-entry-pr.json": "b2000001-0001-4000-8000-000000000013",
  "canada-pgwp.json": "b2000001-0001-4000-8000-000000000014",
  "canada-work-permit.json": "b2000001-0001-4000-8000-000000000015",
  "canada-super-visa.json": "b2000001-0001-4000-8000-000000000016",
  "canada-bowp.json": "b2000001-0001-4000-8000-000000000017",
  "canada-study-permit-extension.json": "b2000001-0001-4000-8000-000000000018",
  "canada-visitor-record.json": "b2000001-0001-4000-8000-000000000019",
  "canada-caips-notes.json": "b2000001-0001-4000-8000-00000000001a",
  "canada-spouse-dependent-owp.json": "b2000001-0001-4000-8000-00000000001b",
};

const parts = [
  "-- Seed full academy_metadata for all Canada visa/immigration services (12 rows)",
  "-- Includes 75 levelled quiz questions per service (Level 1–3)",
  "-- Regenerate: node scripts/generate-canada-metadata-sql.mjs",
  "",
];

for (const [file, id] of Object.entries(CANADA_IDS)) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) {
    console.warn("SKIP", file);
    continue;
  }
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  delete meta._instructions;
  const json = JSON.stringify(meta).replace(/'/g, "''");
  parts.push(`UPDATE public.service_library`);
  parts.push(`SET academy_metadata = '${json}'::jsonb, updated_at = now()`);
  parts.push(`WHERE id = '${id}';`);
  parts.push("");
}

fs.writeFileSync(OUT, parts.join("\n"));
console.log(`Wrote ${OUT} (${Object.keys(CANADA_IDS).length} updates)`);
