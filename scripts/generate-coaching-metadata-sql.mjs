#!/usr/bin/env node
/**
 * Generate supabase/migrations/*_seed_coaching_ielts_services.sql
 * from content/service-library/coaching-ielts-*.json
 *
 * Usage: node scripts/generate-coaching-metadata-sql.mjs
 */
import fs from "fs";
import path from "path";
import { LIBRARY_IDS } from "./lib/service-library-ids.mjs";

const ROOT = path.join(process.cwd(), "content/service-library");
const OUT = path.join(
  process.cwd(),
  "supabase/migrations/20260608000000_seed_coaching_ielts_services.sql",
);

const ROWS = [
  {
    id: LIBRARY_IDS["coaching-ielts-test-reference.json"],
    service: "IELTS",
    sub_service: "Test Reference",
    display_order: 71,
    json: "coaching-ielts-test-reference.json",
  },
  {
    id: LIBRARY_IDS["coaching-ielts-academic-regular.json"],
    service: "IELTS",
    sub_service: "Academic Regular (with books)",
    display_order: 72,
    json: "coaching-ielts-academic-regular.json",
  },
];

function sqlJson(file) {
  const fp = path.join(ROOT, file);
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  delete meta._instructions;
  return JSON.stringify(meta).replace(/'/g, "''");
}

const parts = [
  "-- IELTS coaching service_library rows + academy metadata",
  "-- Specimens: public/specimens/coaching/ielts-test-reference.html",
  "-- Regenerate: node scripts/generate-coaching-metadata-sql.mjs",
  "",
  "INSERT INTO public.service_library (id, service_category, service, sub_service, display_order, is_active)",
  "VALUES",
  ...ROWS.map(
    (r, i) =>
      `  ('${r.id}', 'coaching_services', '${r.service}', '${r.sub_service}', ${r.display_order}, true)${i < ROWS.length - 1 ? "," : ""}`,
  ),
  "ON CONFLICT (service_category, service, sub_service) DO UPDATE",
  "SET display_order = EXCLUDED.display_order, is_active = true, updated_at = now();",
  "",
];

for (const row of ROWS) {
  const json = sqlJson(row.json);
  parts.push(`UPDATE public.service_library`);
  parts.push(`SET academy_metadata = '${json}'::jsonb, updated_at = now()`);
  parts.push(`WHERE id = '${row.id}';`);
  parts.push("");
}

const acRegularId = LIBRARY_IDS["coaching-ielts-academic-regular.json"];
parts.push(`-- Enrollment checklist (HTML primary)`);
parts.push(`INSERT INTO public.service_library_checklist_files`);
parts.push(`  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)`);
parts.push(`SELECT`);
parts.push(`  '${acRegularId}'::uuid,`);
parts.push(`  'IELTS Academic Regular (with books) — Enrollment Checklist.html',`);
parts.push(`  '/specimens/coaching/ielts-academic-regular-checklist.html',`);
parts.push(`  'text/html',`);
parts.push(`  0,`);
parts.push(`  1,`);
parts.push(`  true,`);
parts.push(`  'Coaching enrollment & delivery checklist — Future Link branded'`);
parts.push(`WHERE NOT EXISTS (`);
parts.push(`  SELECT 1 FROM public.service_library_checklist_files cf`);
parts.push(`  WHERE cf.library_id = '${acRegularId}'::uuid`);
parts.push(`    AND cf.file_path = '/specimens/coaching/ielts-academic-regular-checklist.html'`);
parts.push(`);`);
parts.push("");

const testRefId = LIBRARY_IDS["coaching-ielts-test-reference.json"];
parts.push(`-- Test reference specimen as downloadable resource`);
parts.push(`INSERT INTO public.service_library_checklist_files`);
parts.push(`  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)`);
parts.push(`SELECT`);
parts.push(`  '${testRefId}'::uuid,`);
parts.push(`  'IELTS — Test Reference (Service Library specimen).html',`);
parts.push(`  '/specimens/coaching/ielts-test-reference.html',`);
parts.push(`  'text/html',`);
parts.push(`  0,`);
parts.push(`  1,`);
parts.push(`  true,`);
parts.push(`  'Full IELTS test guide — acceptance matrix, test day, module samples'`);
parts.push(`WHERE NOT EXISTS (`);
parts.push(`  SELECT 1 FROM public.service_library_checklist_files cf`);
parts.push(`  WHERE cf.library_id = '${testRefId}'::uuid`);
parts.push(`    AND cf.file_path = '/specimens/coaching/ielts-test-reference.html'`);
parts.push(`);`);
parts.push("");

parts.push(`-- Verify`);
parts.push(`SELECT`);
parts.push(`  sl.id,`);
parts.push(`  sl.service,`);
parts.push(`  sl.sub_service,`);
parts.push(`  sl.academy_metadata->>'displayName' AS display_name,`);
parts.push(`  sl.academy_metadata->>'version' AS version,`);
parts.push(`  jsonb_array_length(COALESCE(sl.academy_metadata->'quiz', '[]'::jsonb)) AS quiz_count,`);
parts.push(`  (SELECT count(*) FROM service_library_checklist_files cf WHERE cf.library_id = sl.id AND cf.is_current) AS checklist_files`);
parts.push(`FROM public.service_library sl`);
parts.push(`WHERE sl.id IN (`);
parts.push(`  '${LIBRARY_IDS["coaching-ielts-test-reference.json"]}'::uuid,`);
parts.push(`  '${LIBRARY_IDS["coaching-ielts-academic-regular.json"]}'::uuid`);
parts.push(`);`);

fs.writeFileSync(OUT, parts.join("\n"));
console.log(`Wrote ${OUT}`);
