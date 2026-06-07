#!/usr/bin/env node
/**
 * Generate supabase/migrations/20260606170000_seed_visa_academy_metadata.sql
 * from content/service-library JSON files (uses same UUID map as build-bulk-upload.mjs).
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "content/service-library");
const OUT = path.join(process.cwd(), "supabase/migrations/20260606170000_seed_visa_academy_metadata.sql");

const LIBRARY_IDS = {
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
  "uk-student-visa.json": "b2000001-0001-4000-8000-000000000021",
  "uk-visitor-visa.json": "b2000001-0001-4000-8000-000000000022",
  "uk-spouse-visa.json": "b2000001-0001-4000-8000-000000000023",
  "uk-skilled-worker.json": "b2000001-0001-4000-8000-000000000024",
  "uk-graduate-route.json": "b2000001-0001-4000-8000-000000000025",
  "usa-student-visa.json": "b2000001-0001-4000-8000-000000000031",
  "usa-visitor-visa.json": "b2000001-0001-4000-8000-000000000032",
  "usa-spouse-visa.json": "b2000001-0001-4000-8000-000000000033",
  "usa-green-card.json": "b2000001-0001-4000-8000-000000000034",
  "australia-student-visa.json": "b2000001-0001-4000-8000-000000000041",
  "australia-visitor-visa.json": "b2000001-0001-4000-8000-000000000042",
  "australia-spouse-visa.json": "b2000001-0001-4000-8000-000000000043",
  "australia-skilled-migration.json": "b2000001-0001-4000-8000-000000000044",
  "australia-subclass-485.json": "b2000001-0001-4000-8000-000000000045",
  "germany-student-visa.json": "b2000001-0001-4000-8000-000000000051",
  "germany-visitor-visa.json": "b2000001-0001-4000-8000-000000000052",
  "germany-spouse-visa.json": "b2000001-0001-4000-8000-000000000053",
  "germany-opportunity-card.json": "b2000001-0001-4000-8000-000000000054",
  "germany-job-seeker.json": "b2000001-0001-4000-8000-000000000055",
  "nz-student-visa.json": "b2000001-0001-4000-8000-000000000061",
  "nz-visitor-visa.json": "b2000001-0001-4000-8000-000000000062",
  "nz-spouse-visa.json": "b2000001-0001-4000-8000-000000000063",
  "nz-skilled-migrant.json": "b2000001-0001-4000-8000-000000000064",
  "nz-post-study-work.json": "b2000001-0001-4000-8000-000000000065",
};

const parts = [
  "-- Auto-generated: seed academy_metadata for canonical visa services",
  "-- Regenerate: node scripts/generate-visa-metadata-sql.mjs",
  "",
];

for (const [file, id] of Object.entries(LIBRARY_IDS)) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) continue;
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  delete meta._instructions;
  const json = JSON.stringify(meta).replace(/'/g, "''");
  parts.push(`UPDATE public.service_library`);
  parts.push(`SET academy_metadata = '${json}'::jsonb, updated_at = now()`);
  parts.push(`WHERE id = '${id}';`);
  parts.push("");
}

fs.writeFileSync(OUT, parts.join("\n"));
console.log(`Wrote ${OUT} (${Object.keys(LIBRARY_IDS).length} updates)`);
