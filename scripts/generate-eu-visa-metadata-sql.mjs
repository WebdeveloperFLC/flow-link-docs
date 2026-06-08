#!/usr/bin/env node
/**
 * Generate academy_metadata migration for NEW EU visa services only.
 * Does not touch existing live service UUIDs (Canada–NZ, Germany 051–055).
 *
 * Run after: node scripts/scaffold-eu-visa-content.mjs
 * Then: node scripts/generate-eu-visa-metadata-sql.mjs
 */
import fs from "fs";
import path from "path";
import { euBaseLibraryIds } from "./lib/eu-visa-service-registry.mjs";

const ROOT = path.join(process.cwd(), "content/service-library");
const OUT = path.join(process.cwd(), "supabase/migrations/20260609102000_seed_eu_visa_academy_metadata.sql");

const NEW_IDS = euBaseLibraryIds();

const parts = [
  "-- Additive: academy_metadata for new EU visa services only (081–0b4 block).",
  "-- Regenerate: node scripts/generate-eu-visa-metadata-sql.mjs",
  "-- Does NOT update existing Germany Opportunity Card (054) or other live services.",
  "",
];

for (const [file, id] of Object.entries(NEW_IDS)) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) {
    console.warn("SKIP missing", file);
    continue;
  }
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  delete meta._instructions;
  const json = JSON.stringify(meta).replace(/'/g, "''");
  parts.push(`UPDATE public.service_library`);
  parts.push(`SET academy_metadata = '${json}'::jsonb, updated_at = now()`);
  parts.push(`WHERE id = '${id}'::uuid;`);
  parts.push("");
}

fs.writeFileSync(OUT, parts.join("\n"));
console.log(`Wrote ${OUT} (${Object.keys(NEW_IDS).length} scoped updates)`);
