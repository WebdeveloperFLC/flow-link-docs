#!/usr/bin/env node
/**
 * Build content/service-library/bulk-upload.json from JSON files + stable library UUIDs.
 */
import fs from "fs";
import path from "path";
import { LIBRARY_IDS } from "./lib/service-library-ids.mjs";

const ROOT = path.join(process.cwd(), "content/service-library");

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
