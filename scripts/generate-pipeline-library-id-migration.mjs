#!/usr/bin/env node
/**
 * Emit SQL to link stage_pipelines.library_id to service_library (additive, non-destructive).
 *
 *   node scripts/generate-pipeline-library-id-migration.mjs
 */
import fs from "fs";
import path from "path";
import { LIBRARY_IDS, slugFromJsonFile } from "./lib/service-library-ids.mjs";
import { CEE_SINGAPORE_SERVICES } from "./lib/cee-singapore-visa-registry.mjs";

const OUT = path.join(
  process.cwd(),
  "supabase/migrations/20260718120013_stage_pipelines_library_id.sql",
);

const byId = new Map();
for (const [file, id] of Object.entries(LIBRARY_IDS)) {
  if (file.startsWith("coaching-") || file.startsWith("mbbs-")) continue;
  byId.set(id, slugFromJsonFile(file));
}
for (const svc of CEE_SINGAPORE_SERVICES) {
  byId.set(svc.id, slugFromJsonFile(svc.file));
}

const updates = [...byId.entries()]
  .sort((a, b) => a[1].localeCompare(b[1]))
  .map(
    ([id, slug]) =>
      `UPDATE public.stage_pipelines SET library_id = '${id}'::uuid\n` +
      `WHERE library_id IS NULL AND description ILIKE '%${slug.replace(/'/g, "''")}%';`,
  );

const sql = `-- Service Library → stage pipeline link (additive). Library is source of truth; staging follows.
-- Regenerate backfill: node scripts/generate-pipeline-library-id-migration.mjs

ALTER TABLE public.stage_pipelines
  ADD COLUMN IF NOT EXISTS library_id uuid REFERENCES public.service_library(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS stage_pipelines_library_id_unique
  ON public.stage_pipelines (library_id)
  WHERE library_id IS NOT NULL;

COMMENT ON COLUMN public.stage_pipelines.library_id IS
  'FK to service_library — one pipeline per visa service. Set from library seed slug in description.';

-- Backfill from Auto-seeded pipeline for {slug} descriptions (does not remove or deactivate rows).
${updates.join("\n\n")}
`;

fs.writeFileSync(OUT, sql);
console.log(`Wrote migration with ${byId.size} backfill updates → ${OUT}`);
