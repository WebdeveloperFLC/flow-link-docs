#!/usr/bin/env node
/**
 * Upload academy_metadata to service_library.
 *
 * Single service (JSON = metadata object only):
 *   SL_LIBRARY_ID=<uuid> node scripts/upload-service-library-metadata.mjs content/service-library/canada-student-visa.json
 *
 * Bulk (JSON = { entries: [{ library_id, academy_metadata }, ...] }):
 *   node scripts/upload-service-library-metadata.mjs content/service-library/bulk-upload.json
 *
 * Legacy match (no library_id — updates all Canada student rows; avoid for production):
 *   SL_MATCH=canada-student node scripts/upload-service-library-metadata.mjs content/service-library/canada-student-visa.json
 */
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { validateKnowledgeCentreJsonCore } from "../src/lib/service-library/knowledgeCentre/validateKnowledgeCentreJsonCore.mjs";

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

const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const sb = createClient(url, key);

function stripInstructions(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const { _instructions, ...rest } = obj;
  return rest;
}

function assertValidMetadata(meta, label) {
  const result = validateKnowledgeCentreJsonCore(meta, { requireSchemaVersion: true });
  if (!result.ok) {
    console.error(`Import rejected — does not conform to docs/KNOWLEDGE_CENTRE_JSON_SPECIFICATION.md (${label}):`);
    for (const issue of result.issues) {
      console.error(`  ${issue.path}: ${issue.message}`);
    }
    process.exit(1);
  }
  console.log(`Validated Knowledge Centre schemaVersion 1.0 (${label})`);
}

async function updateOne(libraryId, meta) {
  const { error } = await sb
    .from("service_library")
    .update({ academy_metadata: stripInstructions(meta), updated_at: new Date().toISOString() })
    .eq("id", libraryId);
  return error;
}

async function main() {
  if (Array.isArray(raw.entries)) {
    let ok = 0;
    for (const entry of raw.entries) {
      const id = entry.library_id;
      const meta = entry.academy_metadata ?? entry.metadata;
      if (!id || !meta) {
        console.log(`SKIP missing library_id or academy_metadata: ${entry.service ?? "?"}`);
        continue;
      }
      assertValidMetadata(meta, id);
      const err = await updateOne(id, meta);
      if (err) console.log(`FAIL ${id} ${entry.sub_service ?? ""}: ${err.message}`);
      else {
        console.log(`OK ${id} ${entry.sub_service ?? entry.service ?? ""}`);
        ok++;
      }
    }
    console.log(`Updated ${ok} of ${raw.entries.length} entries.`);
    return;
  }

  const libraryId = process.env.SL_LIBRARY_ID;
  const meta = stripInstructions(raw);
  assertValidMetadata(meta, jsonPath);

  if (libraryId) {
    const err = await updateOne(libraryId, meta);
    if (err) {
      console.error(err.message);
      process.exit(1);
    }
    console.log(`OK ${libraryId}`);
    return;
  }

  const match = process.env.SL_MATCH || "canada-student";
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
    console.error("No matching rows. Set SL_LIBRARY_ID for a single row upload.");
    process.exit(1);
  }

  for (const row of targets) {
    const err = await updateOne(row.id, meta);
    console.log(err ? `FAIL ${row.sub_service}: ${err.message}` : `OK ${row.id} ${row.sub_service}`);
  }
  console.log(`Updated ${targets.length} row(s). Prefer SL_LIBRARY_ID for one canonical row.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
