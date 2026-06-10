#!/usr/bin/env node
/**
 * @deprecated Monolithic output exceeds Lovable SQL editor limits (~3.5 MB).
 * Use instead: node scripts/generate-visa-metadata-sql-split.mjs
 *   → supabase/migrations/visa-metadata-seed/*.sql (one service per file, ~70 KB)
 */
import fs from "fs";
import path from "path";
import { LIBRARY_IDS } from "./lib/service-library-ids.mjs";

const ROOT = path.join(process.cwd(), "content/service-library");
const OUT = path.join(process.cwd(), "supabase/migrations/visa-metadata-seed/_DEPRECATED_monolithic.sql");

const visaEntries = Object.entries(LIBRARY_IDS).filter(([f]) => !f.startsWith("coaching-"));

const parts = [
  "-- Sync academy_metadata (quiz 75/level, FAQs, red flags, checklists) for all visa services",
  "-- Regenerate: node scripts/generate-visa-metadata-sql.mjs",
  `-- Services: ${visaEntries.length}`,
  "",
];

let count = 0;
for (const [file, id] of visaEntries) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) {
    console.warn(`Skip missing ${file}`);
    continue;
  }
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  delete meta._instructions;
  const quizLen = (meta.quiz ?? []).length;
  const display = meta.displayName ?? file;
  const json = JSON.stringify(meta).replace(/'/g, "''");
  parts.push(`-- ${display} (quiz=${quizLen})`);
  parts.push(`UPDATE public.service_library`);
  parts.push(`SET academy_metadata = '${json}'::jsonb, updated_at = now()`);
  parts.push(`WHERE id = '${id}';`);
  parts.push("");
  count++;
}

parts.push(
  "-- Post-sync verification (expect quiz_total=75, level_1/2/3=25 each)",
  "-- SELECT id, academy_metadata->>'displayName' AS name,",
  "--   jsonb_array_length(COALESCE(academy_metadata->'quiz','[]'::jsonb)) AS quiz_total",
  "-- FROM service_library WHERE service_category='visa_immigration' AND is_active ORDER BY name;",
  "",
);

fs.writeFileSync(OUT, parts.join("\n"));
console.log(`Wrote ${OUT} (${count} updates)`);
