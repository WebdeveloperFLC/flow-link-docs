#!/usr/bin/env node
/**
 * Combine per-service visa-metadata-seed/*.sql into country batch files for faster SQL editor sync.
 * Keeps each batch under ~400 KB to stay within Lovable limits.
 *
 *   node scripts/generate-visa-metadata-country-batches.mjs
 *   → supabase/migrations/visa-metadata-seed/batches/*.sql
 */
import fs from "fs";
import path from "path";

const SEED_DIR = path.join(process.cwd(), "supabase/migrations/visa-metadata-seed");
const BATCH_DIR = path.join(SEED_DIR, "batches");
const MAX_BATCH_KB = 380;

function countryFromSlug(slug) {
  return slug.split("-")[0];
}

function groupByCountry(files) {
  const groups = new Map();
  for (const f of files) {
    const slug = f.replace(/\.sql$/, "");
    const country = countryFromSlug(slug);
    if (!groups.has(country)) groups.set(country, []);
    groups.get(country).push(f);
  }
  return groups;
}

function splitBatch(country, files, contents) {
  const batches = [];
  let current = { files: [], content: "", kb: 0, part: 1 };
  for (let i = 0; i < files.length; i++) {
    const kb = contents[i].length / 1024;
    if (current.files.length > 0 && current.kb + kb > MAX_BATCH_KB) {
      batches.push(current);
      current = { files: [], content: "", kb: 0, part: current.part + 1 };
    }
    current.files.push(files[i]);
    current.content += contents[i] + "\n";
    current.kb += kb;
  }
  if (current.files.length) batches.push(current);
  return batches.map((b) => ({
    name:
      batches.length > 1
        ? `batch-${country}-part${b.part}.sql`
        : `batch-${country}.sql`,
    ...b,
  }));
}

const allFiles = fs
  .readdirSync(SEED_DIR)
  .filter((f) => f.endsWith(".sql") && !f.startsWith("batch-"))
  .sort();

const groups = groupByCountry(allFiles);
fs.mkdirSync(BATCH_DIR, { recursive: true });

// Clear old batches
for (const f of fs.readdirSync(BATCH_DIR)) {
  if (f.endsWith(".sql")) fs.unlinkSync(path.join(BATCH_DIR, f));
}

const manifest = [];

for (const [country, files] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const contents = files.map((f) => fs.readFileSync(path.join(SEED_DIR, f), "utf8"));
  const batches = splitBatch(country, files, contents);
  for (const batch of batches) {
    const header = [
      `-- Country batch: ${country} (${batch.files.length} services)`,
      `-- Files: ${batch.files.join(", ")}`,
      `-- Run in Supabase SQL editor, then hard-refresh Service Library`,
      "",
    ].join("\n");
    const out = header + batch.content;
    const outPath = path.join(BATCH_DIR, batch.name);
    fs.writeFileSync(outPath, out);
    manifest.push({
      country,
      file: batch.name,
      services: batch.files.length,
      kb: (out.length / 1024).toFixed(1),
    });
  }
}

const readme = [
  "# Visa metadata — country batches",
  "",
  "Faster sync: run **one batch per country** instead of 69 individual files.",
  "Each batch stays under ~380 KB for Lovable SQL editor limits.",
  "",
  "Regenerate:",
  "```bash",
  "node scripts/inject-country-insights.mjs",
  "node scripts/generate-visa-metadata-sql-split.mjs",
  "node scripts/generate-visa-metadata-country-batches.mjs",
  "```",
  "",
  "## Run order (all countries)",
  "",
  "| Country | Batch file | Services | Size |",
  "|---------|------------|----------|------|",
  ...manifest.map(
    (m) => `| ${m.country} | \`batches/${m.file}\` | ${m.services} | ${m.kb} KB |`,
  ),
  "",
  "## Verify country insights after sync",
  "",
  "```sql",
  "SELECT",
  "  academy_metadata->>'displayName' AS service,",
  "  academy_metadata->'workingRights'->'applicant'->>'summary' IS NOT NULL AS has_applicant_rights,",
  "  academy_metadata->'workingRights'->'spouse'->>'summary' IS NOT NULL AS has_spouse_rights,",
  "  jsonb_array_length(COALESCE(academy_metadata->'fullCostBreakdown'->'sections','[]'::jsonb)) AS cost_sections",
  "FROM service_library",
  "WHERE service_category = 'visa_immigration' AND is_active",
  "  AND (id::text ~ '^b2000001-0001-4000-8000-' OR id = 'c35e6051-f40f-47bf-9cac-0a386c47a336')",
  "ORDER BY service;",
  "",
  "-- All should show has_applicant_rights=true, has_spouse_rights=true, cost_sections=4",
  "```",
  "",
].join("\n");

fs.writeFileSync(path.join(BATCH_DIR, "README.md"), readme);
console.log(`Wrote ${manifest.length} country batches to ${BATCH_DIR}`);
for (const m of manifest) {
  console.log(`  ${m.file} — ${m.services} services (${m.kb} KB)`);
}
