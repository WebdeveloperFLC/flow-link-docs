#!/usr/bin/env node
/**
 * Split large Canada metadata seed into 12 small SQL files (one service each).
 * Run each file separately in Supabase SQL Editor if the combined file times out.
 *
 *   node scripts/split-canada-metadata-sql.mjs
 *   → supabase/migrations/canada-seed/01-student-visa.sql … 12-spouse-owp.sql
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "content/service-library");
const OUT_DIR = path.join(process.cwd(), "supabase/migrations/canada-seed");

const CANADA_IDS = [
  ["01-student-visa", "canada-student-visa.json", "c35e6051-f40f-47bf-9cac-0a386c47a336"],
  ["02-visitor-trv", "canada-visitor-visa.json", "b2000001-0001-4000-8000-000000000011"],
  ["03-spouse-sponsorship", "canada-spouse-visa.json", "b2000001-0001-4000-8000-000000000012"],
  ["04-express-entry", "canada-express-entry-pr.json", "b2000001-0001-4000-8000-000000000013"],
  ["05-pgwp", "canada-pgwp.json", "b2000001-0001-4000-8000-000000000014"],
  ["06-work-permit", "canada-work-permit.json", "b2000001-0001-4000-8000-000000000015"],
  ["07-super-visa", "canada-super-visa.json", "b2000001-0001-4000-8000-000000000016"],
  ["08-bowp", "canada-bowp.json", "b2000001-0001-4000-8000-000000000017"],
  ["09-study-extension", "canada-study-permit-extension.json", "b2000001-0001-4000-8000-000000000018"],
  ["10-visitor-record", "canada-visitor-record.json", "b2000001-0001-4000-8000-000000000019"],
  ["11-caips", "canada-caips-notes.json", "b2000001-0001-4000-8000-00000000001a"],
  ["12-spouse-owp", "canada-spouse-dependent-owp.json", "b2000001-0001-4000-8000-00000000001b"],
];

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [slug, file, id] of CANADA_IDS) {
  const fp = path.join(ROOT, file);
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  delete meta._instructions;
  const json = JSON.stringify(meta).replace(/'/g, "''");
  const display = meta.displayName ?? file;
  const quizLen = (meta.quiz ?? []).length;
  const sql = [
    `-- ${display} (${quizLen} quiz questions)`,
    `-- Source: content/service-library/${file}`,
    "",
    `UPDATE public.service_library`,
    `SET academy_metadata = '${json}'::jsonb, updated_at = now()`,
    `WHERE id = '${id}';`,
    "",
  ].join("\n");
  const outPath = path.join(OUT_DIR, `${slug}.sql`);
  fs.writeFileSync(outPath, sql);
  console.log(`Wrote ${outPath} (${(sql.length / 1024).toFixed(0)} KB, ${quizLen} quiz)`);
}

console.log(`\nRun each file in Supabase SQL Editor, or use upload script for all at once.`);
