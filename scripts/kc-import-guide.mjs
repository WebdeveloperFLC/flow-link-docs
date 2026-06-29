#!/usr/bin/env node
/**
 * Import a Knowledge Centre guide JSON bundle via Supabase (service role).
 *
 * Requires: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env or environment)
 * Requires migration: 20261016120000_kc_import_guide_rpc.sql
 *
 * Usage:
 *   node scripts/kc-import-guide.mjs content/knowledge-centre/imports/canada-student-visa-outside-canada.json
 *   node scripts/kc-import-guide.mjs <json> --publish
 *   node scripts/kc-import-guide.mjs <json> --publish --replace
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const file = process.argv[2];
const publish = process.argv.includes("--publish");
const replace = process.argv.includes("--replace");

if (!file) {
  console.error("Usage: node scripts/kc-import-guide.mjs <import.json> [--publish] [--replace]");
  process.exit(1);
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const val = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or environment.");
  process.exit(1);
}

const payload = JSON.parse(readFileSync(file, "utf8"));
const supabase = createClient(url, key);

async function runImport() {
  console.log("Importing:", payload.slug, payload.title);
  console.log("Counts:", {
    narrative: payload.narrative_sections?.length,
    faqs: payload.faqs?.length,
    quiz: payload.quiz?.length,
    downloads: payload.downloads?.length,
    sources: payload.official_sources?.length,
    shared: payload.shared_articles?.length,
  });

  const { data, error } = await supabase.rpc("kc_import_guide", {
    p_payload: payload,
    p_replace: replace,
    p_publish: publish,
  });

  if (error) {
    console.error("kc_import_guide RPC failed:", error.message);
    console.error("Publish migration 20261016120000_kc_import_guide_rpc.sql in Lovable if missing.");
    process.exit(1);
  }

  console.log("\n✓ Import complete via kc_import_guide");
  console.log(JSON.stringify(data, null, 2));
  console.log("Reader URL path: /service-library/articles/" + payload.slug);
  if (payload.service_library_ids?.[0]) {
    console.log(
      "Service guide: /service-library?id=" + payload.service_library_ids[0] + "&tab=guide",
    );
  }
}

runImport().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
