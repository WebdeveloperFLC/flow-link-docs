#!/usr/bin/env node
/**
 * Generate MBBS institution content (Phase 2 — all except Saba).
 * Run: node scripts/bootstrap-mbbs-institutions.mjs
 */
import fs from "fs";
import path from "path";
import { MBBS_INSTITUTIONS } from "./lib/mbbs-institutions.mjs";
import {
  buildMbbsMetadata,
  buildChecklistSpec,
  buildSubmissionItems,
} from "./lib/mbbs-content-builder.mjs";

const ROOT = process.cwd();
const JSON_DIR = path.join(ROOT, "content/service-library");
const CHECKLIST_DIR = path.join(ROOT, "content/checklists");
const MIGRATION_DIR = path.join(ROOT, "supabase/migrations");

function sqlEscJson(obj) {
  return JSON.stringify(obj).replace(/'/g, "''");
}

function buildUniversitySql(inst, meta) {
  const jsonEsc = sqlEscJson(meta);
  const processEsc = sqlEscJson(inst.processFlow);
  return `-- ${inst.institutionName}
INSERT INTO public.service_library (
  id, service_category, service, sub_service, display_order, is_active, academy_metadata, process_flow, checklist_text
)
VALUES (
  '${inst.libraryId}',
  'mbbs_services',
  'MBBS',
  '${inst.subService.replace(/'/g, "''")}',
  ${inst.displayOrder},
  true,
  '${jsonEsc}'::jsonb,
  '${processEsc}'::jsonb,
  '<p>See academy_metadata.mbbs.documentChecklistSections for structured checklist.</p>'
)
ON CONFLICT (id) DO UPDATE SET
  service_category = EXCLUDED.service_category,
  service = EXCLUDED.service,
  sub_service = EXCLUDED.sub_service,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  academy_metadata = EXCLUDED.academy_metadata,
  process_flow = EXCLUDED.process_flow,
  checklist_text = EXCLUDED.checklist_text,
  updated_at = now();

DELETE FROM public.service_library_countries WHERE library_id = '${inst.libraryId}';
INSERT INTO public.service_library_countries (library_id, country) VALUES ('${inst.libraryId}', '${inst.country.replace(/'/g, "''")}');
`;
}

function buildParitySql(inst, checklistPath) {
  const htmlPath = path.join(ROOT, "public/specimens/checklists", `${inst.slug}.html`);
  const sizeBytes = fs.existsSync(htmlPath) ? fs.statSync(htmlPath).size : 0;
  const items = buildSubmissionItems(inst);
  const submissionValues = items
    .map(
      (x) =>
        `  ('${x.key}', '${x.label.replace(/'/g, "''")}', ${x.mandatory}, ${x.sort})`,
    )
    .join(",\n");

  const formValues = inst.visaForms
    .map(
      (f, i) =>
        `  ('${inst.libraryId}', '${f.code.replace(/'/g, "''")}', '${f.name.replace(/'/g, "''")}', '${f.url}', 'text/html', ${i + 1}, 1, true, 'Official link — verify current version before client use')`,
    )
    .join(",\n");

  return `
-- ${inst.institutionName} (${inst.libraryId})
INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  '${inst.libraryId}'::uuid,
  '${inst.displayName.replace(/'/g, "''")} — Document Checklist.html',
  '${checklistPath}',
  'text/html',
  ${sizeBytes},
  1,
  true,
  'Future Link branded checklist — fields auto-fill when linked to client'
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files c
  WHERE c.library_id = '${inst.libraryId}'::uuid
    AND c.file_path = '${checklistPath}'
    AND c.is_current = true
);

UPDATE public.service_library_checklist_files
SET is_current = true, updated_at = now()
WHERE library_id = '${inst.libraryId}'::uuid
  AND file_path = '${checklistPath}';

DELETE FROM public.service_library_visa_form_files
WHERE library_id = '${inst.libraryId}'::uuid;

INSERT INTO public.service_library_visa_form_files
  (library_id, form_code, file_name, file_path, mime_type, sort_order, version, is_current, notes)
VALUES
${formValues};

INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT '${inst.libraryId}'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
${submissionValues}
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = '${inst.libraryId}'::uuid AND c.item_key = x.item_key
);
`;
}

function updateServiceLibraryIds() {
  const idsPath = path.join(ROOT, "scripts/lib/service-library-ids.mjs");
  let src = fs.readFileSync(idsPath, "utf8");
  // Remove duplicate mbbs-saba entry if present at end
  src = src.replace(/\n  "mbbs-saba-university\.json": "[^"]+",\n(?=\nexport function slugFromJsonFile)/, "\n");

  for (const inst of MBBS_INSTITUTIONS) {
    const key = `"${inst.slug}.json"`;
    const line = `  "${inst.slug}.json": "${inst.libraryId}",`;
    if (src.includes(key)) {
      src = src.replace(new RegExp(`  "${inst.slug}\\.json": "[^"]+",`), line);
    } else {
      src = src.replace(
        /(\nexport function slugFromJsonFile)/,
        `\n${line}$1`,
      );
    }
  }
  fs.writeFileSync(idsPath, src);
}

function main() {
  const universityParts = [
    `-- MBBS institutions batch — Phase 2 (6 institutions)\n-- Run after 20260611151000_allowlist_mbbs_caribbean.sql\n-- Saba (0d1) seeded separately\n`,
  ];
  const parityParts = [
    `-- MBBS institutions parity — checklist files, application forms, submission tracker\n-- Run after frontend deploy (public/specimens/checklists/mbbs-*.html)\n-- Update size_bytes in checklist_files after generating HTML (optional)\n`,
  ];

  const idLines = [];

  for (const inst of MBBS_INSTITUTIONS) {
    const meta = buildMbbsMetadata(inst);
    const jsonPath = path.join(JSON_DIR, `${inst.slug}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(meta, null, 2) + "\n");
    console.log("Wrote", jsonPath);

    const checklistSpec = buildChecklistSpec(inst, meta);
    const checklistJsonPath = path.join(CHECKLIST_DIR, `${inst.slug}.json`);
    fs.writeFileSync(checklistJsonPath, JSON.stringify(checklistSpec, null, 2) + "\n");
    console.log("Wrote", checklistJsonPath);

    universityParts.push(buildUniversitySql(inst, meta));

    const checklistHtmlPath = `/specimens/checklists/${inst.slug}.html`;
    parityParts.push(buildParitySql(inst, checklistHtmlPath));

    idLines.push(`  "${inst.slug}.json": "${inst.libraryId}",`);
  }

  const uniSqlPath = path.join(MIGRATION_DIR, "20260611154000_mbbs_institutions_batch.sql");
  fs.writeFileSync(uniSqlPath, universityParts.join("\n"));
  console.log("Wrote", uniSqlPath);

  const paritySqlPath = path.join(MIGRATION_DIR, "20260611154100_mbbs_institutions_parity.sql");
  fs.writeFileSync(paritySqlPath, parityParts.join("\n"));
  console.log("Wrote", paritySqlPath);

  updateServiceLibraryIds();
  console.log("Updated scripts/lib/service-library-ids.mjs");
  console.log("\nNext: node scripts/generate-mbbs-checklist-specimens.mjs");
}

main();
