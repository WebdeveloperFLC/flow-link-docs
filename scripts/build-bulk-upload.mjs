#!/usr/bin/env node
/**
 * Build content/service-library/bulk-upload.json from JSON files + stable library UUIDs.
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "content/service-library");

const LIBRARY_IDS = {
  "canada-student-visa.json": "c35e6051-f40f-47bf-9cac-0a386c47a336",
  "canada-visitor-visa.json": "b2000001-0001-4000-8000-000000000011",
  "canada-spouse-visa.json": "b2000001-0001-4000-8000-000000000012",
  "canada-express-entry-pr.json": "b2000001-0001-4000-8000-000000000013",
  "canada-pgwp.json": "b2000001-0001-4000-8000-000000000014",
  "canada-work-permit.json": "b2000001-0001-4000-8000-000000000015",
  "canada-super-visa.json": "b2000001-0001-4000-8000-000000000016",
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

const entries = [];
for (const [file, library_id] of Object.entries(LIBRARY_IDS)) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) {
    console.warn("SKIP missing", file);
    continue;
  }
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  delete meta._instructions;
  entries.push({
    library_id,
    file,
    sub_service: meta.displayName ?? file,
    academy_metadata: meta,
  });
}

const out = { entries };
const outPath = path.join(ROOT, "bulk-upload.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${entries.length} entries to ${outPath}`);
