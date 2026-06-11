#!/usr/bin/env node
/**
 * FAQ + checklist seeds + parity migration for UAE visa services.
 * Run: node scripts/generate-uae-artifacts.mjs
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { LIBRARY_IDS } from "./lib/service-library-ids.mjs";
import { renderChecklistHtml, countItems } from "./lib/flc-checklist-template.mjs";
import { buildFromService, slugFromFile } from "./lib/build-checklist-from-service.mjs";

const ROOT = path.join(process.cwd(), "content/service-library");
const FAQ_DIR = path.join(process.cwd(), "supabase/migrations/faq-seed");
const CL_DIR = path.join(process.cwd(), "supabase/migrations/checklist-seed");
const OUT_DIR = path.join(process.cwd(), "public/specimens/checklists");
const LOGO = path.join(process.cwd(), "public/specimens/flc-logo.png");

const FILES = [
  "uae-student-visa.json",
  "uae-spouse-dependent-visa.json",
  "uae-visitor-visa.json",
  "uae-work-permit.json",
  "uae-golden-visa.json",
];

const TARGET = 30;

function ensureQuestion(q) {
  const t = String(q ?? "").trim();
  if (!t) return "";
  return t.endsWith("?") ? t : `${t}?`;
}

function expandFaqs(meta) {
  const displayName = meta.displayName ?? "this service";
  const seeds = [];
  for (const f of meta.faqs ?? []) seeds.push({ q: ensureQuestion(f.q), a: f.a });
  for (const row of meta.about ?? []) {
    if (row.label && row.value) seeds.push({ q: `What is ${row.label} for this service?`, a: row.value });
  }
  for (const e of meta.eligibility ?? []) {
    seeds.push({ q: `Is ${e.criterion} required?`, a: e.note ?? `${e.criterion} is typically required.` });
  }
  const generic = [
    { q: "Can Future Link guarantee approval?", a: "No. Government authorities decide each case. Never promise approval." },
    { q: "What documents should we collect first?", a: "Passport, application forms, fees, and the service checklist in the Checklist tab." },
    { q: "How long does processing take?", a: "See KPI processing time — always verify current GDRFA/ICP timelines before quoting." },
    { q: "What are government fees?", a: "Confirm latest fees on the official portal in the Resources section before quoting." },
    { q: "Can the client apply from India?", a: "Yes — standard route for Indian nationals via sponsor, VFS, or ICP e-visa as applicable." },
    { q: "What if the client was refused before?", a: "Disclose all refusals, overstays, and bans; address GDRFA fines before reapply." },
    { q: "Can the client work on this visa?", a: "Work rights depend on visa type — employment visa required for full-time work." },
  ];
  const out = [];
  const seen = new Set();
  for (const item of [...seeds, ...generic]) {
    const key = item.q.toLowerCase();
    if (seen.has(key) || !item.a?.trim()) continue;
    seen.add(key);
    out.push({ q: item.q, a: item.a.trim() });
    if (out.length >= TARGET) break;
  }
  while (out.length < TARGET) {
    out.push({
      q: `${displayName}: counselor verification point ${out.length + 1}?`,
      a: "Confirm eligibility, checklist sign-off, current fees, and client consent before submission.",
    });
  }
  return out.slice(0, TARGET);
}

function slug(file) {
  return file.replace(".json", "").replace(/-/g, "_");
}

function sqlEscape(s) {
  return s.replace(/'/g, "''");
}

const WORKFLOW_TAIL = [
  { key: "fees_collected", label: "Fees collected (consultancy + government)", mandatory: true },
  { key: "client_approval_received", label: "Client approval on final file", mandatory: true },
  { key: "quality_review_completed", label: "Quality review sign-off", mandatory: true },
  { key: "submission_approved", label: "Submission approved & lodged", mandatory: true },
];

function buildChecklistItems(meta) {
  const items = [];
  const seen = new Set();
  let order = 1;
  for (const row of meta.eligibility ?? []) {
    const label = row.criterion?.trim();
    if (!label) continue;
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 48);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ key, label, mandatory: true, sort_order: order++ });
  }
  for (const row of WORKFLOW_TAIL) {
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    items.push({ key: row.key, label: row.label, mandatory: row.mandatory, sort_order: order++ });
  }
  return items;
}

fs.mkdirSync(FAQ_DIR, { recursive: true });
fs.mkdirSync(CL_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const faqParts = ["-- UAE visa FAQ seeds", "-- Regenerate: node scripts/generate-uae-artifacts.mjs", ""];
const clParts = ["-- UAE submission checklist seeds", ""];
const checklistLinks = [];

const logoSrc = `data:image/png;base64,${fs.readFileSync(LOGO).toString("base64")}`;

for (const file of FILES) {
  const fp = path.join(ROOT, file);
  const id = LIBRARY_IDS[file];
  if (!id || !fs.existsSync(fp)) {
    console.warn("SKIP", file);
    continue;
  }
  let meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  meta.faqs = expandFaqs(meta);
  fs.writeFileSync(fp, JSON.stringify(meta, null, 2) + "\n");

  const faqJson = JSON.stringify(meta.faqs).replace(/'/g, "''");
  const display = meta.displayName ?? file;
  const faqSql = [
    `-- ${display} — ${meta.faqs.length} FAQs`,
    `UPDATE public.service_library`,
    `SET academy_metadata = jsonb_set(`,
    `  COALESCE(academy_metadata, '{}'::jsonb),`,
    `  '{faqs}',`,
    `  '${faqJson}'::jsonb`,
    `), updated_at = now()`,
    `WHERE id = '${id}'::uuid;`,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(FAQ_DIR, `${slug(file)}.sql`), faqSql);
  faqParts.push(faqSql);
  console.log("FAQ", slug(file));

  const items = buildChecklistItems(meta);
  const values = items
    .map((it) => `  ('${sqlEscape(it.key)}', '${sqlEscape(it.label)}', ${it.mandatory}, ${it.sort_order})`)
    .join(",\n");
  const clSql = [
    `-- ${display} — ${items.length} checklist items`,
    `INSERT INTO public.service_library_submission_checklist`,
    `  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)`,
    `SELECT '${id}'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true`,
    `FROM (VALUES`,
    values,
    `) AS x(item_key, item_label, is_mandatory, sort_order)`,
    `WHERE NOT EXISTS (`,
    `  SELECT 1 FROM public.service_library_submission_checklist c`,
    `  WHERE c.library_id = '${id}'::uuid AND c.item_key = x.item_key`,
    `);`,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(CL_DIR, `${slug(file)}.sql`), clSql);
  clParts.push(clSql);
  console.log("CL ", slug(file));

  const spec = buildFromService(file);
  const slugName = spec.slug ?? slugFromFile(file);
  const html = renderChecklistHtml(spec, logoSrc);
  fs.writeFileSync(path.join(OUT_DIR, `${slugName}.html`), html);
  checklistLinks.push({
    id,
    slug: slugName,
    name: spec.displayName ?? slugName,
    bytes: Buffer.byteLength(html),
    items: countItems(spec),
  });
  console.log(`HTML ${slugName}.html (${countItems(spec)} items)`);
}

const linkRows = checklistLinks
  .map(
    (l) =>
      `  ('${l.id}'::uuid, '${l.name.replace(/'/g, "''")} — Document Checklist.html', '/specimens/checklists/${l.slug}.html', 'text/html', ${l.bytes}, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client')`,
  )
  .join(",\n");

const paritySql = [
  ...faqParts,
  ...clParts,
  "-- Link checklist HTML specimens",
  "INSERT INTO public.service_library_checklist_files",
  "  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)",
  "SELECT v.library_id, v.file_name, v.file_path, v.mime_type, v.size_bytes, v.version, v.is_current, v.notes",
  "FROM (VALUES",
  linkRows,
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
  path.join(process.cwd(), "supabase/migrations/20260613101000_seed_uae_parity.sql"),
  paritySql,
);

spawnSync(process.execPath, ["scripts/generate-all-service-checklist-specimens.mjs"], { cwd: process.cwd(), stdio: "inherit" });
spawnSync(process.execPath, ["scripts/generate-visa-metadata-sql-split.mjs"], { cwd: process.cwd(), stdio: "inherit" });
spawnSync(process.execPath, ["scripts/generate-visa-metadata-country-batches.mjs"], { cwd: process.cwd(), stdio: "inherit" });

console.log("Done UAE artifacts.");
