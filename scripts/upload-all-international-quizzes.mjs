#!/usr/bin/env node
/**
 * Push 75-question quiz metadata to Supabase for all non-Canada-canonical services + Canada spouse.
 * Avoids pasting 60KB SQL files in the SQL Editor.
 *
 *   export VITE_SUPABASE_URL=https://xxx.supabase.co
 *   export SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   node scripts/upload-all-international-quizzes.mjs
 *
 * Single service:
 *   node scripts/upload-all-international-quizzes.mjs germany-opportunity-card
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const ROOT = path.join(process.cwd(), "content/service-library");
const sb = createClient(url, key);

const SERVICES = [
  ["uk-student-visa.json", "b2000001-0001-4000-8000-000000000021"],
  ["uk-visitor-visa.json", "b2000001-0001-4000-8000-000000000022"],
  ["uk-spouse-visa.json", "b2000001-0001-4000-8000-000000000023"],
  ["uk-skilled-worker.json", "b2000001-0001-4000-8000-000000000024"],
  ["uk-graduate-route.json", "b2000001-0001-4000-8000-000000000025"],
  ["usa-student-visa.json", "b2000001-0001-4000-8000-000000000031"],
  ["usa-visitor-visa.json", "b2000001-0001-4000-8000-000000000032"],
  ["usa-spouse-visa.json", "b2000001-0001-4000-8000-000000000033"],
  ["usa-green-card.json", "b2000001-0001-4000-8000-000000000034"],
  ["australia-student-visa.json", "b2000001-0001-4000-8000-000000000041"],
  ["australia-visitor-visa.json", "b2000001-0001-4000-8000-000000000042"],
  ["australia-spouse-visa.json", "b2000001-0001-4000-8000-000000000043"],
  ["australia-skilled-migration.json", "b2000001-0001-4000-8000-000000000044"],
  ["australia-subclass-485.json", "b2000001-0001-4000-8000-000000000045"],
  ["germany-student-visa.json", "b2000001-0001-4000-8000-000000000051"],
  ["germany-visitor-visa.json", "b2000001-0001-4000-8000-000000000052"],
  ["germany-spouse-visa.json", "b2000001-0001-4000-8000-000000000053"],
  ["germany-opportunity-card.json", "b2000001-0001-4000-8000-000000000054"],
  ["germany-job-seeker.json", "b2000001-0001-4000-8000-000000000055"],
  ["nz-student-visa.json", "b2000001-0001-4000-8000-000000000061"],
  ["nz-visitor-visa.json", "b2000001-0001-4000-8000-000000000062"],
  ["nz-spouse-visa.json", "b2000001-0001-4000-8000-000000000063"],
  ["nz-skilled-migrant.json", "b2000001-0001-4000-8000-000000000064"],
  ["nz-post-study-work.json", "b2000001-0001-4000-8000-000000000065"],
  ["canada-spouse-visa.json", "b2000001-0001-4000-8000-000000000012"],
];

const filter = process.argv[2]?.toLowerCase();

async function uploadOne(file, id) {
  const fp = path.join(ROOT, file);
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  delete meta._instructions;
  const quizLen = (meta.quiz ?? []).length;

  const { data, error } = await sb
    .from("service_library")
    .update({ academy_metadata: meta, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, sub_service, academy_metadata");

  if (error) return { ok: false, file, id, msg: error.message };

  if (!data?.length) {
    const { data: byName } = await sb
      .from("service_library")
      .select("id, sub_service, service")
      .eq("service_category", "visa_immigration")
      .ilike("sub_service", `%${meta.displayName?.split("–").pop()?.trim().slice(0, 20) ?? ""}%`)
      .limit(3);
    return {
      ok: false,
      file,
      id,
      msg: `No row for id ${id}. Similar rows: ${JSON.stringify(byName ?? [])}`,
    };
  }

  const saved = data[0].academy_metadata?.quiz?.length ?? 0;
  return {
    ok: saved >= 75,
    file,
    id,
    sub: data[0].sub_service,
    quizLen: saved,
    expected: quizLen,
  };
}

async function main() {
  let list = SERVICES;
  if (filter) {
    list = SERVICES.filter(([f]) => f.toLowerCase().includes(filter));
    if (!list.length) {
      console.error(`No service matching "${filter}"`);
      process.exit(1);
    }
  }

  let ok = 0;
  let fail = 0;
  for (const [file, id] of list) {
    const r = await uploadOne(file, id);
    if (r.ok) {
      console.log(`✓ ${file} → ${r.sub} (${r.quizLen} quiz)`);
      ok++;
    } else {
      console.log(`✗ ${file}: ${r.msg}`);
      fail++;
    }
  }
  console.log(`\nDone: ${ok} ok, ${fail} failed of ${list.length}`);
  if (fail) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
