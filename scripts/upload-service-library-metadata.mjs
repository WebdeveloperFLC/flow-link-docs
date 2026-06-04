#!/usr/bin/env node
/**
 * Upload academy_metadata JSON to service_library rows.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/upload-service-library-metadata.mjs content/service-library/canada-student-visa.json
 *
 * Get service role key: Supabase Dashboard → Project Settings → API → service_role (secret)
 */
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error("Usage: node scripts/upload-service-library-metadata.mjs <path-to.json>");
  process.exit(1);
}

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const match = process.env.SL_MATCH || "canada-student"; // canada-student | all-from-file

const sb = createClient(url, key);

const { data: rows, error } = await sb
  .from("service_library")
  .select("id, service, sub_service, service_library_countries(country)")
  .eq("service_category", "visa_immigration")
  .eq("is_active", true);

if (error) {
  console.error(error.message);
  process.exit(1);
}

const targets = (rows ?? []).filter((r) => {
  const hasCanada = (r.service_library_countries ?? []).some((c) => c.country === "Canada");
  if (!hasCanada) return false;
  if (match === "canada-student") {
    return /student|study permit/i.test(r.sub_service) || /student/i.test(r.service);
  }
  return true;
});

if (!targets.length) {
  console.error("No matching service_library rows found.");
  process.exit(1);
}

for (const row of targets) {
  const { error: uerr } = await sb
    .from("service_library")
    .update({ academy_metadata: meta })
    .eq("id", row.id);
  console.log(uerr ? `FAIL ${row.sub_service}: ${uerr.message}` : `OK ${row.id} ${row.sub_service}`);
}

console.log(`Updated ${targets.length} row(s).`);
