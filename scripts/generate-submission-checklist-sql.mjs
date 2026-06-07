#!/usr/bin/env node
/**
 * Generate submission checklist SQL from eligibility + workflow steps in JSON.
 *
 *   node scripts/generate-submission-checklist-sql.mjs
 *   → supabase/migrations/checklist-seed/*.sql
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "content/service-library");
const OUT_DIR = path.join(process.cwd(), "supabase/migrations/checklist-seed");

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

const WORKFLOW_TAIL = [
  { key: "fees_collected", label: "Fees collected (consultancy + government)", mandatory: true },
  { key: "client_approval_received", label: "Client approval on final file", mandatory: true },
  { key: "quality_review_completed", label: "Quality review sign-off", mandatory: true },
  { key: "submission_approved", label: "Submission approved & lodged", mandatory: true },
];

function slugKey(text, i) {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  return base || `item_${i}`;
}

function buildItems(meta) {
  const items = [];
  const seen = new Set();
  let order = 1;

  for (const row of meta.eligibility ?? []) {
    const label = row.criterion?.trim();
    if (!label) continue;
    const key = slugKey(label, order);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ key, label, mandatory: true, sort_order: order++ });
  }

  for (const row of WORKFLOW_TAIL) {
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    items.push({
      key: row.key,
      label: row.label,
      mandatory: row.mandatory,
      sort_order: order++,
    });
  }

  return items;
}

function slug(file) {
  return file.replace(".json", "").replace(/-/g, "_");
}

function sqlEscape(s) {
  return s.replace(/'/g, "''");
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const diagnose = [
  "-- Submission checklist item counts (expect >= 10 per active visa service)",
  "SELECT",
  "  sl.id,",
  "  sl.academy_metadata->>'displayName' AS service_name,",
  "  (SELECT count(*) FROM service_library_submission_checklist c",
  "     WHERE c.library_id = sl.id AND c.is_active = true) AS checklist_items",
  "FROM service_library sl",
  "WHERE sl.service_category = 'visa_immigration'",
  "  AND sl.is_active = true",
  "  AND sl.academy_metadata ? 'displayName'",
  "ORDER BY checklist_items ASC, service_name;",
  "",
  "SELECT",
  "  COUNT(*) FILTER (WHERE sub.cnt >= 10) AS done_10plus,",
  "  COUNT(*) FILTER (WHERE sub.cnt < 10) AS need_more,",
  "  COUNT(*) AS total,",
  "  MIN(sub.cnt) AS min_items,",
  "  MAX(sub.cnt) AS max_items",
  "FROM (",
  "  SELECT sl.id,",
  "    (SELECT count(*) FROM service_library_submission_checklist c",
  "       WHERE c.library_id = sl.id AND c.is_active = true) AS cnt",
  "  FROM service_library sl",
  "  WHERE sl.service_category = 'visa_immigration'",
  "    AND sl.is_active = true",
  "    AND sl.academy_metadata ? 'displayName'",
  ") sub;",
  "",
];

fs.writeFileSync(path.join(OUT_DIR, "00-diagnose-checklist-counts.sql"), diagnose.join("\n"));

const allSql = [
  "-- Seed submission checklist items for all 36 visa services",
  "-- Source: eligibility criteria in content/service-library/*.json + workflow tail",
  "-- Safe to re-run (skips existing item_key per service)",
  "",
];

for (const [file, id] of Object.entries(LIBRARY_IDS)) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) continue;
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  const items = buildItems(meta);
  const display = meta.displayName ?? file;

  const values = items
    .map(
      (it) =>
        `  ('${sqlEscape(it.key)}', '${sqlEscape(it.label)}', ${it.mandatory}, ${it.sort_order})`,
    )
    .join(",\n");

  const block = [
    `-- ${display} — ${items.length} checklist items`,
    `INSERT INTO public.service_library_submission_checklist`,
    `  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)`,
    `SELECT '${id}'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true`,
    `FROM (VALUES`,
    values,
    `) AS x(item_key, item_label, is_mandatory, sort_order)`,
    `WHERE NOT EXISTS (`,
    `  SELECT 1 FROM public.service_library_submission_checklist c`,
    `  WHERE c.library_id = '${id}'::uuid AND c.item_key = x.item_key`,
    `);`,
    "",
  ].join("\n");

  fs.writeFileSync(path.join(OUT_DIR, `${slug(file)}.sql`), block);
  allSql.push(block);
  console.log(`✓ ${slug(file)}.sql (${items.length} items)`);
}

const combinedPath = path.join(OUT_DIR, "01-apply-all-checklists.sql");
fs.writeFileSync(combinedPath, allSql.join("\n"));
console.log(`\n✓ 01-apply-all-checklists.sql (${(allSql.join("\n").length / 1024).toFixed(0)} KB)`);
console.log(`Wrote ${Object.keys(LIBRARY_IDS).length} files to ${OUT_DIR}`);
