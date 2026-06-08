#!/usr/bin/env node
/**
 * Expand FAQs and generate faq-seed + checklist-seed SQL for NEW EU services only.
 * Does not rewrite existing Germany / Canada / UK seed files.
 */
import fs from "fs";
import path from "path";
import { euBaseLibraryIds } from "./lib/eu-visa-service-registry.mjs";

const ROOT = path.join(process.cwd(), "content/service-library");
const FAQ_DIR = path.join(process.cwd(), "supabase/migrations/faq-seed");
const CL_DIR = path.join(process.cwd(), "supabase/migrations/checklist-seed");
const TARGET = 30;

const EU_FILES = Object.keys(euBaseLibraryIds());

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
    { q: "How long does processing take?", a: "See KPI processing time — always verify current embassy timelines before quoting." },
    { q: "What are government fees?", a: "Confirm latest fees on the official portal in the Resources section before quoting." },
    { q: "Can the client apply from India?", a: "Usually yes via the competent embassy or VFS — confirm jurisdiction for this case." },
    { q: "What if the client was refused before?", a: "Disclose all refusals and address prior grounds with new evidence." },
    { q: "Can the client work on this visa?", a: "Work rights depend on visa type — quote only official conditions." },
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
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 48);
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

const faqApply = [
  "-- EU visa FAQ seeds (additive — new services 081–0b4 only)",
  "-- Regenerate: node scripts/generate-eu-artifacts.mjs",
  "",
];
const clApply = [
  "-- EU visa submission checklist seeds (additive — new services 081–0b4 only)",
  "-- Regenerate: node scripts/generate-eu-artifacts.mjs",
  "",
];
const faqMigrationParts = [
  "-- EU visa FAQ seeds (additive — new services 081–0b4 only)",
  "-- Regenerate: node scripts/generate-eu-artifacts.mjs",
  "",
];
const clMigrationParts = [
  "-- EU visa submission checklist seeds (additive — new services 081–0b4 only)",
  "-- Regenerate: node scripts/generate-eu-artifacts.mjs",
  "",
];

for (const file of EU_FILES) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) {
    console.warn("SKIP missing", file);
    continue;
  }
  const id = euBaseLibraryIds()[file];
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
  const faqPath = path.join(FAQ_DIR, `${slug(file)}.sql`);
  fs.writeFileSync(faqPath, faqSql);
  faqApply.push(`\\i supabase/migrations/faq-seed/${slug(file)}.sql`);
  faqMigrationParts.push(faqSql);
  console.log("FAQ", slug(file));

  const items = buildChecklistItems(meta);
  const values = items
    .map(
      (it) =>
        `  ('${sqlEscape(it.key)}', '${sqlEscape(it.label)}', ${it.mandatory}, ${it.sort_order})`,
    )
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
  const clPath = path.join(CL_DIR, `${slug(file)}.sql`);
  fs.writeFileSync(clPath, clSql);
  clApply.push(`\\i supabase/migrations/checklist-seed/${slug(file)}.sql`);
  clMigrationParts.push(clSql);
  console.log("CL ", slug(file));
}

fs.writeFileSync(path.join(FAQ_DIR, "eu-apply-all-faqs.sql"), faqApply.join("\n"));
fs.writeFileSync(path.join(CL_DIR, "eu-apply-all-checklists.sql"), clApply.join("\n"));
fs.writeFileSync(
  path.join(process.cwd(), "supabase/migrations/20260609104000_seed_eu_visa_faqs.sql"),
  faqMigrationParts.join("\n"),
);
fs.writeFileSync(
  path.join(process.cwd(), "supabase/migrations/20260609105000_seed_eu_submission_checklists.sql"),
  clMigrationParts.join("\n"),
);
console.log("Done EU artifacts.");
