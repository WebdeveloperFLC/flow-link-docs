#!/usr/bin/env node
/** Generate HTML checklist specimens for NEW EU visa services only. */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { renderChecklistHtml, countItems } from "./lib/flc-checklist-template.mjs";
import { buildFromService, slugFromFile } from "./lib/build-checklist-from-service.mjs";
import { euBaseLibraryIds } from "./lib/eu-visa-service-registry.mjs";

const OUT_DIR = path.join(process.cwd(), "public/specimens/checklists");
const LOGO = path.join(process.cwd(), "public/specimens/flc-logo.png");

function logoDataUri() {
  const b64 = fs.readFileSync(LOGO).toString("base64");
  return `data:image/png;base64,${b64}`;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const logoSrc = logoDataUri();
const links = [];

for (const file of Object.keys(euBaseLibraryIds())) {
  const spec = buildFromService(file);
  const slug = spec.slug ?? slugFromFile(file);
  const html = renderChecklistHtml(spec, logoSrc);
  const outPath = path.join(OUT_DIR, `${slug}.html`);
  fs.writeFileSync(outPath, html);
  const items = countItems(spec);
  links.push({ id: euBaseLibraryIds()[file], slug, name: spec.displayName ?? slug, bytes: Buffer.byteLength(html) });
  console.log(`✓ ${slug}.html (${items} items)`);
}

const valueRows = links
  .map(
    (l) =>
      `  ('${l.id}'::uuid, '${l.name.replace(/'/g, "''")} — Document Checklist.html', '/specimens/checklists/${l.slug}.html', 'text/html', ${l.bytes}, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client')`,
  )
  .join(",\n");

const sql = [
  "-- Link EU checklist HTML specimens (additive)",
  "INSERT INTO public.service_library_checklist_files",
  "  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)",
  "SELECT v.library_id, v.file_name, v.file_path, v.mime_type, v.size_bytes, v.version, v.is_current, v.notes",
  "FROM (VALUES",
  valueRows,
  ") AS v(library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)",
  "WHERE NOT EXISTS (",
  "  SELECT 1 FROM public.service_library_checklist_files c",
  "  WHERE c.library_id = v.library_id",
  "    AND c.file_path = v.file_path",
  "    AND c.is_current = true",
  ");",
  "",
].join("\n");

fs.writeFileSync(
  path.join(process.cwd(), "supabase/migrations/20260609103000_link_eu_checklist_specimens.sql"),
  sql,
);
console.log("Wrote checklist link migration");

// Refresh master index listing (includes EU + all existing services)
const idx = spawnSync(process.execPath, ["scripts/generate-all-service-checklist-specimens.mjs"], {
  cwd: process.cwd(),
  stdio: "inherit",
});
if (idx.status !== 0) process.exit(idx.status ?? 1);
