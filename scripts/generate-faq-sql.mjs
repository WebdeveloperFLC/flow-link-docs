#!/usr/bin/env node
/**
 * Generate FAQ-only SQL updates (jsonb_set) — smaller than full metadata uploads.
 * Run after: node scripts/expand-service-faqs.mjs
 *
 *   node scripts/generate-faq-sql.mjs
 *   → supabase/migrations/faq-seed/*.sql
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "content/service-library");
const OUT_DIR = path.join(process.cwd(), "supabase/migrations/faq-seed");

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

function slug(file) {
  return file.replace(".json", "").replace(/-/g, "_");
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const diagnose = [
  "-- FAQ counts after applying faq-seed/*.sql (expect 30 each)",
  "SELECT",
  "  id,",
  "  academy_metadata->>'displayName' AS service_name,",
  "  jsonb_array_length(COALESCE(academy_metadata->'faqs', '[]'::jsonb)) AS faq_count",
  "FROM service_library",
  "WHERE service_category = 'visa_immigration'",
  "  AND is_active = true",
  "  AND academy_metadata ? 'displayName'",
  "ORDER BY faq_count ASC, service_name;",
  "",
  "SELECT",
  "  COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(academy_metadata->'faqs', '[]'::jsonb)) >= 30) AS done_30,",
  "  COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(academy_metadata->'faqs', '[]'::jsonb)) < 30) AS need_more,",
  "  COUNT(*) AS total",
  "FROM service_library",
  "WHERE service_category = 'visa_immigration'",
  "  AND is_active = true",
  "  AND academy_metadata ? 'displayName';",
  "",
];

fs.writeFileSync(path.join(OUT_DIR, "00-diagnose-faq-counts.sql"), diagnose.join("\n"));

const allUpdates = [
  "-- Apply 30 FAQs to all 36 visa services (one paste in SQL Editor)",
  "-- Does NOT touch quiz questions — only patches academy_metadata.faqs",
  "-- After run, execute 00-diagnose-faq-counts.sql → expect done_30 = 36",
  "",
];

for (const [file, id] of Object.entries(LIBRARY_IDS)) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) continue;
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  const faqs = meta.faqs ?? [];
  const faqJson = JSON.stringify(faqs).replace(/'/g, "''");
  const display = meta.displayName ?? file;

  const sql = [
    `-- ${display} — ${faqs.length} FAQs`,
    `-- Source: content/service-library/${file}`,
    "",
    `UPDATE public.service_library`,
    `SET academy_metadata = jsonb_set(`,
    `  COALESCE(academy_metadata, '{}'::jsonb),`,
    `  '{faqs}',`,
    `  '${faqJson}'::jsonb`,
    `),`,
    `updated_at = now()`,
    `WHERE id = '${id}';`,
    "",
  ].join("\n");

  const outPath = path.join(OUT_DIR, `${slug(file)}.sql`);
  fs.writeFileSync(outPath, sql);
  allUpdates.push(sql);
  console.log(`✓ ${slug(file)}.sql (${faqs.length} FAQs, ${(sql.length / 1024).toFixed(0)} KB)`);
}

const combinedPath = path.join(OUT_DIR, "01-apply-all-faqs.sql");
fs.writeFileSync(combinedPath, allUpdates.join("\n"));
console.log(`\n✓ 01-apply-all-faqs.sql (${(allUpdates.join("\n").length / 1024).toFixed(0)} KB combined)`);
console.log(`Wrote ${Object.keys(LIBRARY_IDS).length} files to ${OUT_DIR}`);
