#!/usr/bin/env node
/**
 * Import a Knowledge Centre guide JSON bundle via Supabase (service role).
 *
 * Requires: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in environment or .env.local
 *
 * Usage:
 *   node scripts/kc-import-guide.mjs content/knowledge-centre/imports/canada-student-visa-outside-canada.json
 *   node scripts/kc-import-guide.mjs content/knowledge-centre/imports/canada-student-visa-outside-canada.json --publish
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const file = process.argv[2];
const publish = process.argv.includes("--publish");

if (!file) {
  console.error("Usage: node scripts/kc-import-guide.mjs <import.json> [--publish]");
  process.exit(1);
}

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const payload = JSON.parse(readFileSync(file, "utf8"));
const supabase = createClient(url, key);

async function main() {
  console.log("Importing:", payload.slug, payload.title);
  console.log("Counts:", {
    narrative: payload.narrative_sections?.length,
    faqs: payload.faqs?.length,
    quiz: payload.quiz?.length,
    downloads: payload.downloads?.length,
    sources: payload.official_sources?.length,
    shared: payload.shared_articles?.length,
  });
  console.log("\nFor production import, use Knowledge Centre Admin → Load Canada template → Import.");
  console.log("This CLI validates JSON only unless you extend it with full executeGuideImport parity.");
  if (publish) console.log("(Publish flag noted — use Admin Publish after import)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
