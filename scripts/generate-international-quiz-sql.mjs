#!/usr/bin/env node
/**
 * Generate per-country SQL seeds for international visa services (75 quiz each).
 * Run after: node scripts/expand-service-quizzes.mjs
 *
 *   node scripts/generate-international-quiz-sql.mjs
 *   → supabase/migrations/international-seed/{uk,usa,australia,germany,nz}/*.sql
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "content/service-library");
const OUT_DIR = path.join(process.cwd(), "supabase/migrations/international-seed");

/** slug, json file, uuid */
const SERVICES = [
  // UK
  ["uk-01-student", "uk-student-visa.json", "b2000001-0001-4000-8000-000000000021"],
  ["uk-02-visitor", "uk-visitor-visa.json", "b2000001-0001-4000-8000-000000000022"],
  ["uk-03-spouse", "uk-spouse-visa.json", "b2000001-0001-4000-8000-000000000023"],
  ["uk-04-skilled-worker", "uk-skilled-worker.json", "b2000001-0001-4000-8000-000000000024"],
  ["uk-05-graduate-route", "uk-graduate-route.json", "b2000001-0001-4000-8000-000000000025"],
  // USA
  ["usa-01-student", "usa-student-visa.json", "b2000001-0001-4000-8000-000000000031"],
  ["usa-02-visitor", "usa-visitor-visa.json", "b2000001-0001-4000-8000-000000000032"],
  ["usa-03-spouse", "usa-spouse-visa.json", "b2000001-0001-4000-8000-000000000033"],
  ["usa-04-green-card", "usa-green-card.json", "b2000001-0001-4000-8000-000000000034"],
  // Australia
  ["au-01-student", "australia-student-visa.json", "b2000001-0001-4000-8000-000000000041"],
  ["au-02-visitor", "australia-visitor-visa.json", "b2000001-0001-4000-8000-000000000042"],
  ["au-03-spouse", "australia-spouse-visa.json", "b2000001-0001-4000-8000-000000000043"],
  ["au-04-skilled", "australia-skilled-migration.json", "b2000001-0001-4000-8000-000000000044"],
  ["au-05-subclass-485", "australia-subclass-485.json", "b2000001-0001-4000-8000-000000000045"],
  ["au-06-work-holiday", "australia-work-holiday.json", "b2000001-0001-4000-8000-000000000046"],
  // Germany
  ["de-01-student", "germany-student-visa.json", "b2000001-0001-4000-8000-000000000051"],
  ["de-02-visitor", "germany-visitor-visa.json", "b2000001-0001-4000-8000-000000000052"],
  ["de-03-spouse", "germany-spouse-visa.json", "b2000001-0001-4000-8000-000000000053"],
  ["de-04-opportunity-card", "germany-opportunity-card.json", "b2000001-0001-4000-8000-000000000054"],
  ["de-05-job-seeker", "germany-job-seeker.json", "b2000001-0001-4000-8000-000000000055"],
  // New Zealand
  ["nz-01-student", "nz-student-visa.json", "b2000001-0001-4000-8000-000000000061"],
  ["nz-02-visitor", "nz-visitor-visa.json", "b2000001-0001-4000-8000-000000000062"],
  ["nz-03-spouse", "nz-spouse-visa.json", "b2000001-0001-4000-8000-000000000063"],
  ["nz-04-skilled-migrant", "nz-skilled-migrant.json", "b2000001-0001-4000-8000-000000000064"],
  ["nz-05-post-study-work", "nz-post-study-work.json", "b2000001-0001-4000-8000-000000000065"],
];

function writeSql(slug, file, id, outSubdir) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) {
    console.warn(`Skip missing ${file}`);
    return;
  }
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  delete meta._instructions;
  const quizLen = (meta.quiz ?? []).length;
  const json = JSON.stringify(meta).replace(/'/g, "''");
  const display = meta.displayName ?? file;
  const dir = path.join(OUT_DIR, outSubdir);
  fs.mkdirSync(dir, { recursive: true });
  const sql = [
    `-- ${display} (${quizLen} quiz questions)`,
    `-- Source: content/service-library/${file}`,
    "",
    `UPDATE public.service_library`,
    `SET academy_metadata = '${json}'::jsonb, updated_at = now()`,
    `WHERE id = '${id}';`,
    "",
  ].join("\n");
  const outPath = path.join(dir, `${slug}.sql`);
  fs.writeFileSync(outPath, sql);
  console.log(`✓ ${outSubdir}/${slug}.sql (${(sql.length / 1024).toFixed(0)} KB, quiz=${quizLen})`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [slug, file, id] of SERVICES) {
  const country = slug.split("-")[0];
  writeSql(slug, file, id, country);
}

// Canada spouse sponsorship (was 5 quiz)
writeSql("03-spouse-sponsorship", "canada-spouse-visa.json", "b2000001-0001-4000-8000-000000000012", "canada");

console.log("\nRun each .sql file in Supabase SQL Editor (one service at a time if large).");
console.log("Verify: SELECT id, jsonb_array_length(academy_metadata->'quiz') FROM service_library WHERE id = '...';");
