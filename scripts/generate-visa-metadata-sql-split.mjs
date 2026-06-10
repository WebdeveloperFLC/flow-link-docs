#!/usr/bin/env node
/**
 * Split visa academy_metadata sync into small SQL files (~70 KB each) for Lovable SQL editor.
 *
 *   node scripts/generate-visa-metadata-sql-split.mjs
 *   → supabase/migrations/visa-metadata-seed/*.sql
 *   → supabase/migrations/visa-metadata-seed/README.md
 */
import fs from "fs";
import path from "path";
import { LIBRARY_IDS } from "./lib/service-library-ids.mjs";

const ROOT = path.join(process.cwd(), "content/service-library");
const OUT_DIR = path.join(process.cwd(), "supabase/migrations/visa-metadata-seed");

function writeServiceSql(file, id, meta) {
  delete meta._instructions;
  const quizLen = (meta.quiz ?? []).length;
  const display = meta.displayName ?? file;
  const slug = file.replace(/\.json$/, "");
  const json = JSON.stringify(meta).replace(/'/g, "''");
  const sql = [
    `-- ${display} (quiz=${quizLen})`,
    `-- Source: content/service-library/${file}`,
    `-- library_id: ${id}`,
    "",
    `UPDATE public.service_library`,
    `SET academy_metadata = '${json}'::jsonb, updated_at = now()`,
    `WHERE id = '${id}';`,
    "",
  ].join("\n");
  const outPath = path.join(OUT_DIR, `${slug}.sql`);
  fs.writeFileSync(outPath, sql);
  return { slug, kb: (sql.length / 1024).toFixed(1), quizLen, display };
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const visaEntries = Object.entries(LIBRARY_IDS).filter(([f]) => !f.startsWith("coaching-"));
const written = [];

for (const [file, id] of visaEntries) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) {
    console.warn(`Skip missing ${file}`);
    continue;
  }
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  written.push(writeServiceSql(file, id, meta));
}

written.sort((a, b) => a.slug.localeCompare(b.slug));

const readme = [
  "# Visa academy_metadata sync (split for SQL editor)",
  "",
  "The monolithic `20260610361000_sync_all_visa_academy_metadata.sql` exceeds Lovable request limits.",
  "Run **one file at a time** in the SQL editor (each ~60–75 KB).",
  "",
  "Regenerate: `node scripts/generate-visa-metadata-sql-split.mjs`",
  "",
  "## Run order",
  "",
  "| # | File | Service | Size | Quiz |",
  "|---|------|---------|------|------|",
  ...written.map((w, i) => `| ${i + 1} | \`${w.slug}.sql\` | ${w.display} | ${w.kb} KB | ${w.quizLen} |`),
  "",
  "## Faster sync — country batches",
  "",
  "Run one file per country instead of 69 individual files:",
  "",
  "```bash",
  "node scripts/generate-visa-metadata-country-batches.mjs",
  "```",
  "",
  "Then paste each file from `visa-metadata-seed/batches/` into the SQL editor.",
  "",
  "## Verify after all files",
  "",
  "```sql",
  "SELECT * FROM v_visa_content_health WHERE status <> 'ok';",
  "",
  "-- Country & costs (working rights + full cost breakdown)",
  "SELECT academy_metadata->>'displayName' AS service,",
  "  academy_metadata->'workingRights'->'applicant'->>'summary' IS NOT NULL AS applicant_rights,",
  "  academy_metadata->'workingRights'->'spouse'->>'summary' IS NOT NULL AS spouse_rights,",
  "  jsonb_array_length(COALESCE(academy_metadata->'fullCostBreakdown'->'sections','[]'::jsonb)) AS cost_sections",
  "FROM service_library",
  "WHERE service_category='visa_immigration' AND is_active",
  "ORDER BY service;",
  "```",
  "",
].join("\n");

fs.writeFileSync(path.join(OUT_DIR, "README.md"), readme);
console.log(`Wrote ${written.length} files to ${OUT_DIR}`);
console.log(`Largest: ${written.reduce((a, b) => (parseFloat(a.kb) > parseFloat(b.kb) ? a : b)).slug}.sql`);
