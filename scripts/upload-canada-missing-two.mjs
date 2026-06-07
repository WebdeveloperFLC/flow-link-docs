#!/usr/bin/env node
/**
 * Upload only the 2 Canada services that often fail in SQL Editor (student + visitor TRV).
 * Usage:
 *   export VITE_SUPABASE_URL=...
 *   export SUPABASE_SERVICE_ROLE_KEY=...
 *   node scripts/upload-canada-missing-two.mjs
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

const sb = createClient(url, key);
const ROOT = path.join(process.cwd(), "content/service-library");

const TARGETS = [
  {
    file: "canada-student-visa.json",
    ids: ["c35e6051-f40f-47bf-9cac-0a386c47a336"],
    match: { service: "Canada", sub_service_patterns: ["%Student%", "%Study Permit%"] },
  },
  {
    file: "canada-visitor-visa.json",
    ids: ["b2000001-0001-4000-8000-000000000011"],
    match: { service: "Canada", sub_service_patterns: ["%Visitor%TRV%", "%Visitor Visa%"] },
  },
];

async function main() {
  for (const t of TARGETS) {
    const meta = JSON.parse(fs.readFileSync(path.join(ROOT, t.file), "utf8"));
    delete meta._instructions;
    const quizLen = (meta.quiz ?? []).length;
    let updated = 0;

    for (const id of t.ids) {
      const { data, error } = await sb
        .from("service_library")
        .update({ academy_metadata: meta, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id, sub_service");
      if (error) console.error(`FAIL id ${id}:`, error.message);
      else if (data?.length) {
        console.log(`OK id ${id} → ${data[0].sub_service} (${quizLen} quiz)`);
        updated += data.length;
      } else {
        console.warn(`No row for id ${id}`);
      }
    }

    if (updated === 0) {
      const { data: rows } = await sb
        .from("service_library")
        .select("id, sub_service")
        .eq("service_category", "visa_immigration")
        .eq("service", "Canada")
        .eq("is_active", true);
      for (const row of rows ?? []) {
        const hit = t.match.sub_service_patterns.some((p) => {
          const re = new RegExp("^" + p.replace(/%/g, ".*") + "$", "i");
          return re.test(row.sub_service);
        });
        if (!hit) continue;
        const { error } = await sb
          .from("service_library")
          .update({ academy_metadata: meta, updated_at: new Date().toISOString() })
          .eq("id", row.id);
        if (error) console.error(`FAIL ${row.sub_service}:`, error.message);
        else {
          console.log(`OK matched ${row.id} → ${row.sub_service} (${quizLen} quiz)`);
          updated++;
        }
      }
    }
    if (!updated) console.error(`Could not update any row for ${t.file}`);
  }
}

main();
