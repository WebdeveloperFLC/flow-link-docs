#!/usr/bin/env node
/** Build canada-only bulk upload for upload-service-library-metadata.mjs */
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "content/service-library");
const IDS = {
  "canada-student-visa.json": "c35e6051-f40f-47bf-9cac-0a386c47a336",
  "canada-visitor-visa.json": "b2000001-0001-4000-8000-000000000011",
  "canada-spouse-visa.json": "b2000001-0001-4000-8000-000000000012",
  "canada-express-entry-pr.json": "b2000001-0001-4000-8000-000000000013",
  "canada-pgwp.json": "b2000001-0001-4000-8000-000000000014",
  "canada-work-permit.json": "b2000001-0001-4000-8000-000000000015",
  "canada-super-visa.json": "b2000001-0001-4000-8000-000000000016",
  "canada-bowp.json": "b2000001-0001-4000-8000-000000000017",
  "canada-study-permit-extension.json": "b2000001-0001-4000-8000-000000000018",
  "canada-visitor-record.json": "b2000001-0001-4000-8000-000000000019",
  "canada-caips-notes.json": "b2000001-0001-4000-8000-00000000001a",
  "canada-spouse-dependent-owp.json": "b2000001-0001-4000-8000-00000000001b",
};

const entries = [];
for (const [file, library_id] of Object.entries(IDS)) {
  const meta = JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
  delete meta._instructions;
  entries.push({ library_id, file, sub_service: meta.displayName, academy_metadata: meta });
}
const out = path.join(ROOT, "canada-bulk-upload.json");
fs.writeFileSync(out, JSON.stringify({ entries }, null, 2));
console.log(`Wrote ${entries.length} entries → ${out}`);
