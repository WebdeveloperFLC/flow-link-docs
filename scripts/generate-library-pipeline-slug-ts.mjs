#!/usr/bin/env node
/**
 * Regenerate src/lib/stagePipelineLibrarySlug.ts from scripts/lib/service-library-ids.mjs.
 * Service Library is primary — every visa JSON maps to one stage pipeline via library_id / description slug.
 *
 *   node scripts/generate-library-pipeline-slug-ts.mjs
 */
import fs from "fs";
import path from "path";
import { LIBRARY_IDS, slugFromJsonFile } from "./lib/service-library-ids.mjs";
import { CEE_SINGAPORE_SERVICES } from "./lib/cee-singapore-visa-registry.mjs";

const OUT = path.join(process.cwd(), "src/lib/stagePipelineLibrarySlug.ts");

/** @type {Map<string, string>} libraryId → slug (hyphenated, no .json) */
const byId = new Map();

for (const [file, id] of Object.entries(LIBRARY_IDS)) {
  if (file.startsWith("coaching-") || file.startsWith("mbbs-")) continue;
  byId.set(id, slugFromJsonFile(file));
}

for (const svc of CEE_SINGAPORE_SERVICES) {
  byId.set(svc.id, slugFromJsonFile(svc.file));
}

const lines = Object.entries(Object.fromEntries(byId))
  .sort(([, a], [, b]) => a.localeCompare(b))
  .map(([id, slug]) => `  "${slug}": "${id}",`);

const content = `/**
 * Maps service_library.id → stage_pipelines description seed slug
 * (\`Auto-seeded pipeline for {slug}\`). Service Library is the source of truth.
 *
 * Regenerate: node scripts/generate-library-pipeline-slug-ts.mjs
 */
const SLUG_TO_LIBRARY_ID: Record<string, string> = {
${lines.join("\n")}
};

/** service_library.id → pipeline description slug (e.g. uk-student-visa). */
export const LIBRARY_PIPELINE_SEED_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_TO_LIBRARY_ID).map(([slug, id]) => [id, slug]),
);

export const PIPELINE_BACKED_LIBRARY_IDS: ReadonlySet<string> = new Set(
  Object.values(SLUG_TO_LIBRARY_ID),
);
`;

fs.writeFileSync(OUT, content);
console.log(`Wrote ${byId.size} library↔pipeline slugs → ${OUT}`);
