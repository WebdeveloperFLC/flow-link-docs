#!/usr/bin/env node
/**
 * Generate additive coaching SQL migrations from registry + content JSON.
 * Run: node scripts/generate-coaching-migrations.mjs
 */
import fs from "fs";
import path from "path";
import { defaultSubmissionItems } from "./lib/coaching-content-builder.mjs";
import { COACHING_REGISTRY, registryByPhase } from "./lib/coaching-service-registry.mjs";

const ROOT = path.join(process.cwd(), "content/service-library");
const MIGRATIONS = path.join(process.cwd(), "supabase/migrations");

function sqlJson(file) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) throw new Error(`Missing ${fp}`);
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  delete meta._instructions;
  return JSON.stringify(meta).replace(/'/g, "''");
}

function esc(s) {
  return String(s ?? "").replace(/'/g, "''");
}

/** Match live row by natural key — survives ON CONFLICT when legacy UUID differs from registry id. */
function whereNaturalKey(entry) {
  return `service_category = 'coaching_services' AND service = '${esc(entry.service)}' AND sub_service = '${esc(entry.sub_service)}'`;
}

function libraryIdSubquery(entry) {
  return `(SELECT id FROM public.service_library WHERE ${whereNaturalKey(entry)} LIMIT 1)`;
}

function buildMigration(name, entries, header) {
  const parts = [
    `-- ${header}`,
    "-- Regenerate: node scripts/generate-coaching-migrations.mjs",
    "",
    "INSERT INTO public.service_library (id, service_category, service, sub_service, display_order, is_active)",
    "VALUES",
    ...entries.map(
      (e, i) =>
        `  ('${e.id}', 'coaching_services', '${esc(e.service)}', '${esc(e.sub_service)}', ${e.display_order}, true)${i < entries.length - 1 ? "," : ""}`,
    ),
    "ON CONFLICT (service_category, service, sub_service) DO UPDATE",
    "SET display_order = EXCLUDED.display_order, is_active = true, updated_at = now();",
    "",
  ];

  for (const entry of entries) {
    const json = sqlJson(entry.jsonFile);
    parts.push(`-- ${entry.displayName}`);
    parts.push(`UPDATE public.service_library`);
    parts.push(`SET academy_metadata = '${json}'::jsonb, updated_at = now()`);
    parts.push(`WHERE ${whereNaturalKey(entry)};`);
    parts.push("");
  }

  for (const entry of entries) {
    if (!entry.checklistHtml) continue;
    const fileName = `${esc(entry.displayName)} — Enrollment Checklist.html`;
    parts.push(`INSERT INTO public.service_library_checklist_files`);
    parts.push(`  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)`);
    parts.push(`SELECT`);
    parts.push(`  ${libraryIdSubquery(entry)},`);
    parts.push(`  '${fileName}',`);
    parts.push(`  '${entry.checklistHtml}',`);
    parts.push(`  'text/html',`);
    parts.push(`  0,`);
    parts.push(`  1,`);
    parts.push(`  true,`);
    parts.push(`  'Coaching enrollment checklist — ${esc(entry.displayName)}'`);
    parts.push(`WHERE ${libraryIdSubquery(entry)} IS NOT NULL`);
    parts.push(`  AND NOT EXISTS (`);
    parts.push(`  SELECT 1 FROM public.service_library_checklist_files cf`);
    parts.push(`  WHERE cf.library_id = ${libraryIdSubquery(entry)}`);
    parts.push(`    AND cf.file_path = '${entry.checklistHtml}'`);
    parts.push(`);`);
    parts.push("");
  }

  for (const entry of entries) {
    const items = defaultSubmissionItems();
    parts.push(`-- Submission checklist — ${entry.displayName}`);
    parts.push(`INSERT INTO public.service_library_submission_checklist`);
    parts.push(`  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)`);
    parts.push(
      `SELECT ${libraryIdSubquery(entry)}, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true`,
    );
    parts.push(`FROM (VALUES`);
    parts.push(
      items
        .map(
          (it) =>
            `  ('${it.item_key}', '${esc(it.item_label)}', ${it.is_mandatory}, ${it.sort_order})`,
        )
        .join(",\n"),
    );
    parts.push(`) AS x(item_key, item_label, is_mandatory, sort_order)`);
    parts.push(`WHERE ${libraryIdSubquery(entry)} IS NOT NULL`);
    parts.push(`  AND NOT EXISTS (`);
    parts.push(`  SELECT 1 FROM public.service_library_submission_checklist c`);
    parts.push(`  WHERE c.library_id = ${libraryIdSubquery(entry)} AND c.item_key = x.item_key`);
    parts.push(`);`);
    parts.push("");
  }

  const out = path.join(MIGRATIONS, name);
  fs.writeFileSync(out, parts.join("\n"));
  console.log(`Wrote ${out} (${entries.length} services)`);
}

const phaseB = registryByPhase("B");
const phaseC = [
  ...registryByPhase("C").filter((e) => e.family === "French Language" || e.family === "German Language"),
  ...registryByPhase("C").filter((e) => ["GRE", "GMAT", "SAT"].includes(e.family)),
];

buildMigration(
  "20260610100000_seed_coaching_ielts_remaining.sql",
  phaseB.filter((e) => e.family === "IELTS"),
  "IELTS coaching — remaining variants + full metadata refresh (additive)",
);

buildMigration(
  "20260610101000_seed_coaching_english_proficiency.sql",
  phaseB.filter((e) =>
    ["PTE", "TOEFL", "CELPIP", "Duolingo English Test", "Spoken English"].includes(e.family),
  ),
  "English proficiency coaching — full academy packs (additive)",
);

buildMigration(
  "20260610102000_seed_coaching_french_german.sql",
  phaseC.filter((e) => e.family === "French Language" || e.family === "German Language"),
  "French & German language coaching — full academy packs (additive)",
);

buildMigration(
  "20260610103000_seed_coaching_grad_admissions.sql",
  phaseC.filter((e) => ["GRE", "GMAT", "SAT"].includes(e.family)),
  "Graduate admissions coaching — GRE, GMAT, SAT (additive)",
);

// Update service-library-ids.mjs
const idsPath = path.join(process.cwd(), "scripts/lib/service-library-ids.mjs");
let idsSrc = fs.readFileSync(idsPath, "utf8");
for (const entry of COACHING_REGISTRY) {
  const key = `"${entry.jsonFile}"`;
  if (!idsSrc.includes(key)) {
    const insertBefore = "};\n\nexport function slugFromJsonFile";
    idsSrc = idsSrc.replace(
      insertBefore,
      `  ${key}: "${entry.id}",\n};\n\nexport function slugFromJsonFile`,
    );
  }
}
fs.writeFileSync(idsPath, idsSrc);
console.log("Updated scripts/lib/service-library-ids.mjs");
