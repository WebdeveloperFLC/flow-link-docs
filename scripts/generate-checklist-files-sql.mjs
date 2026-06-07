#!/usr/bin/env node
/**
 * Generate SQL to register static checklist HTML in service_library_checklist_files.
 * Files live at /specimens/checklists/{slug}.html (no storage upload required).
 *
 *   node scripts/generate-checklist-files-sql.mjs
 *   → supabase/migrations/checklist-files-seed/01-link-static-checklists.sql
 */
import fs from "fs";
import path from "path";
import { LIBRARY_IDS, slugFromJsonFile } from "./lib/service-library-ids.mjs";

const OUT = path.join(process.cwd(), "supabase/migrations/checklist-files-seed/01-link-static-checklists.sql");
const CHECKLIST_DIR = path.join(process.cwd(), "public/specimens/checklists");
const META_ROOT = path.join(process.cwd(), "content/service-library");

function fileName(slug) {
  const metaPath = path.join(META_ROOT, `${slug}.json`);
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      return `${meta.displayName ?? slug} — Document Checklist.html`.replace(/'/g, "''");
    } catch {
      /* fall through */
    }
  }
  return `${slug} — Document Checklist.html`.replace(/'/g, "''");
}

const rows = [];
for (const [jsonFile, libraryId] of Object.entries(LIBRARY_IDS)) {
  const slug = slugFromJsonFile(jsonFile);
  const htmlPath = path.join(CHECKLIST_DIR, `${slug}.html`);
  if (!fs.existsSync(htmlPath)) {
    console.warn(`SKIP missing HTML: ${slug}.html`);
    continue;
  }
  const size = fs.statSync(htmlPath).size;
  const name = fileName(slug);
  const staticPath = `/specimens/checklists/${slug}.html`;
  rows.push({ libraryId, name, staticPath, size, slug });
}

const values = rows
  .map(
    (r) =>
      `  ('${r.libraryId}'::uuid, '${r.name}', '${r.staticPath}', 'text/html', ${r.size}, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client')`,
  )
  .join(",\n");

const sql = `-- Link static branded checklists (public/specimens/checklists/*.html)
-- Run in Supabase SQL Editor after publishing frontend (Lovable).
-- Counselors download from Admin → Checklist tab and Resources → Downloadable files.

UPDATE public.service_library_checklist_files
SET is_current = false, updated_at = now()
WHERE file_path LIKE '/specimens/checklists/%'
   OR notes ILIKE '%Future Link branded checklist%';

INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT v.library_id, v.file_name, v.file_path, v.mime_type, v.size_bytes, v.version, v.is_current, v.notes
FROM (VALUES
${values}
) AS v(library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files c
  WHERE c.library_id = v.library_id
    AND c.file_path = v.file_path
    AND c.is_current = true
);

-- Re-activate if rows already exist but were marked inactive
UPDATE public.service_library_checklist_files cf
SET is_current = true, updated_at = now()
FROM (VALUES
${values}
) AS v(library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
WHERE cf.library_id = v.library_id::uuid
  AND cf.file_path = v.file_path
  AND cf.is_current = false;
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, sql);
console.log(`✓ Wrote ${OUT} (${rows.length} services)`);
console.log("Apply in Supabase SQL Editor, then verify with 00-diagnose-checklist-files.sql");
