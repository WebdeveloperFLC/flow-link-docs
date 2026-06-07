#!/usr/bin/env node
/**
 * Push 30 FAQs per service to Supabase (patches faqs only — quiz unchanged).
 *
 *   export VITE_SUPABASE_URL=https://xxx.supabase.co
 *   export SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   node scripts/upload-all-faqs.mjs
 *
 * Single service:
 *   node scripts/upload-all-faqs.mjs germany-opportunity-card
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

const filter = process.argv[2]?.toLowerCase();

async function uploadOne(file, id) {
  const fp = path.join(ROOT, file);
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  const faqs = meta.faqs ?? [];
  if (faqs.length < 30) {
    return { ok: false, file, id, msg: `JSON has only ${faqs.length} FAQs` };
  }

  const { data: row, error: fetchErr } = await sb
    .from("service_library")
    .select("id, sub_service, academy_metadata")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) return { ok: false, file, id, msg: fetchErr.message };
  if (!row) {
    return { ok: false, file, id, msg: `No row for id ${id}` };
  }

  const merged = { ...(row.academy_metadata ?? {}), faqs };
  const { data, error } = await sb
    .from("service_library")
    .update({ academy_metadata: merged, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, sub_service, academy_metadata");

  if (error) return { ok: false, file, id, msg: error.message };

  const saved = data?.[0]?.academy_metadata?.faqs?.length ?? 0;
  return {
    ok: saved >= 30,
    file,
    id,
    sub: data[0].sub_service,
    faqLen: saved,
  };
}

async function main() {
  let list = Object.entries(LIBRARY_IDS);
  if (filter) {
    list = list.filter(([f]) => f.toLowerCase().includes(filter));
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
      console.log(`✓ ${file} → ${r.sub} (${r.faqLen} FAQs)`);
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
