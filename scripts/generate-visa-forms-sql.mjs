#!/usr/bin/env node
/**
 * Generate SQL to register official visa forms in service_library_visa_form_files.
 *
 *   node scripts/generate-visa-forms-sql.mjs
 *   → supabase/migrations/visa-forms-seed/01-link-official-visa-forms.sql
 */
import fs from "fs";
import path from "path";
import { LIBRARY_IDS, slugFromJsonFile } from "./lib/service-library-ids.mjs";
import { VISA_FORMS_CATALOG } from "./lib/visa-forms-catalog.mjs";

const OUT = path.join(process.cwd(), "supabase/migrations/visa-forms-seed/01-link-official-visa-forms.sql");

function esc(s) {
  return String(s).replace(/'/g, "''");
}

const rows = [];
for (const [jsonFile, libraryId] of Object.entries(LIBRARY_IDS)) {
  const slug = slugFromJsonFile(jsonFile);
  const forms = VISA_FORMS_CATALOG[slug];
  if (!forms?.length) {
    console.warn(`SKIP no forms catalog: ${slug}`);
    continue;
  }
  forms.forEach((f, i) => {
    rows.push({
      libraryId,
      formCode: f.form_code,
      title: f.title,
      url: f.url,
      mime: f.mime ?? "application/pdf",
      sortOrder: i + 1,
      notes: f.notes ?? "Official government form — verify current version before client use",
    });
  });
}

const values = rows
  .map(
    (r) =>
      `  ('${r.libraryId}'::uuid, '${esc(r.formCode)}', '${esc(r.title)}', '${esc(r.url)}', '${r.mime}', ${r.sortOrder}, 1, true, '${esc(r.notes)}')`,
  )
  .join(",\n");

const sql = `-- Link official visa / immigration forms (government URLs)
-- Run in Supabase SQL Editor after migration 20260607120000_service_library_visa_form_files.sql
-- Counselors open from Service Library → Visa forms tab

UPDATE public.service_library_visa_form_files
SET is_current = false, updated_at = now()
WHERE notes ILIKE '%Official government form%';

INSERT INTO public.service_library_visa_form_files
  (library_id, form_code, file_name, file_path, mime_type, sort_order, version, is_current, notes)
SELECT v.library_id, v.form_code, v.file_name, v.file_path, v.mime_type, v.sort_order, v.version, v.is_current, v.notes
FROM (VALUES
${values}
) AS v(library_id, form_code, file_name, file_path, mime_type, sort_order, version, is_current, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_visa_form_files f
  WHERE f.library_id = v.library_id
    AND f.form_code = v.form_code
    AND f.file_path = v.file_path
    AND f.is_current = true
);

UPDATE public.service_library_visa_form_files f
SET is_current = true, updated_at = now()
FROM (VALUES
${values}
) AS v(library_id, form_code, file_name, file_path, mime_type, sort_order, version, is_current, notes)
WHERE f.library_id = v.library_id::uuid
  AND f.form_code = v.form_code
  AND f.file_path = v.file_path
  AND f.is_current = false;
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, sql);
console.log(`✓ Wrote ${OUT} (${rows.length} forms across ${Object.keys(VISA_FORMS_CATALOG).length} services)`);
