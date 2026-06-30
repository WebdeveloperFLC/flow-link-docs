#!/usr/bin/env node
/**
 * Bulk-upload service_library JSON files from content/service-library/.
 *
 * Uses scripts/lib/service-library-ids.mjs for library_id mapping.
 *
 * Usage:
 *   node scripts/upload-service-library-fleet.mjs                    # all mapped ZIP guides
 *   node scripts/upload-service-library-fleet.mjs canada-visitor-visa.json
 *   node scripts/upload-service-library-fleet.mjs --dry-run
 *
 * Env: VITE_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { LIBRARY_IDS } from "./lib/service-library-ids.mjs";
import { validateKnowledgeCentreJsonCore } from "../src/lib/service-library/knowledgeCentre/validateKnowledgeCentreJsonCore.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(__dirname, "../content/service-library");

const dryRun = process.argv.includes("--dry-run");
const fileArgs = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dryRun && (!url || !key)) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or use --dry-run)");
  process.exit(1);
}

function stripInstructions(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const { _instructions, ...rest } = obj;
  return rest;
}

async function uploadOne(filename, libraryId, sb) {
  const fp = path.join(CONTENT_DIR, filename);
  if (!fs.existsSync(fp)) {
    console.log(`SKIP missing file: ${filename}`);
    return { ok: false, skipped: true };
  }

  const meta = stripInstructions(JSON.parse(fs.readFileSync(fp, "utf8")));
  const label = `${filename} → ${libraryId}`;

  if (!meta.schemaRef && !meta.schemaVersion) {
    console.log(`SKIP legacy (no schemaRef): ${label}`);
    return { ok: false, skipped: true };
  }

  const result = validateKnowledgeCentreJsonCore(meta, { requireSchemaVersion: true });
  if (!result.ok) {
    console.log(`FAIL validation ${label}`);
    for (const issue of result.issues.slice(0, 5)) {
      console.log(`  ${issue.path}: ${issue.message}`);
    }
    if (result.issues.length > 5) console.log(`  … +${result.issues.length - 5} more`);
    return { ok: false, skipped: false };
  }

  if (dryRun) {
    console.log(`DRY OK ${label} (${meta.displayName ?? meta.slug ?? "?"})`);
    return { ok: true, skipped: false };
  }

  const { error } = await sb
    .from("service_library")
    .update({ academy_metadata: meta, updated_at: new Date().toISOString() })
    .eq("id", libraryId);

  if (error) {
    console.log(`FAIL ${label}: ${error.message}`);
    return { ok: false, skipped: false };
  }
  console.log(`OK ${label}`);
  return { ok: true, skipped: false };
}

async function main() {
  const sb =
    !dryRun && url && key
      ? (await import("@supabase/supabase-js")).createClient(url, key)
      : null;

  const entries = fileArgs.length
    ? fileArgs.map((f) => [f.endsWith(".json") ? f : `${f}.json`, LIBRARY_IDS[f.endsWith(".json") ? f : `${f}.json`]])
    : Object.entries(LIBRARY_IDS);

  let ok = 0;
  let fail = 0;
  let skip = 0;

  for (const [filename, libraryId] of entries) {
    if (!libraryId) {
      console.log(`SKIP no library_id mapping: ${filename}`);
      skip++;
      continue;
    }
    const res = await uploadOne(filename, libraryId, sb);
    if (res.skipped) skip++;
    else if (res.ok) ok++;
    else fail++;
  }

  console.log(`\nDone: ${ok} uploaded, ${fail} failed, ${skip} skipped${dryRun ? " (dry-run)" : ""}.`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
