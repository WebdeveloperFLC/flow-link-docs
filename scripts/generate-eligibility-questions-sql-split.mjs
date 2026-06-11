#!/usr/bin/env node
/**
 * Split eligibility question seeds into regional batches for Lovable SQL editor.
 *
 *   node scripts/generate-eligibility-questions-sql-split.mjs
 *   → supabase/migrations/eligibility-seed/*.sql
 */
import fs from "fs";
import path from "path";
import { LIBRARY_IDS } from "./lib/service-library-ids.mjs";

const ROOT = path.join(process.cwd(), "content/service-library");
const OUT_DIR = path.join(process.cwd(), "supabase/migrations/eligibility-seed");

const HAND_CRAFTED_IDS = new Set([
  "b2000001-0001-4000-8000-000000000017",
  "b2000001-0001-4000-8000-000000000013",
]);

const SETTLE_ABROAD_IDS = new Set([
  "b2000001-0001-4000-8000-000000000011",
  "b2000001-0001-4000-8000-000000000012",
  "b2000001-0001-4000-8000-000000000013",
  "b2000001-0001-4000-8000-000000000014",
  "b2000001-0001-4000-8000-000000000015",
  "b2000001-0001-4000-8000-000000000016",
  "b2000001-0001-4000-8000-000000000051",
  "b2000001-0001-4000-8000-000000000052",
  "b2000001-0001-4000-8000-000000000053",
  "b2000001-0001-4000-8000-000000000054",
  "b2000001-0001-4000-8000-000000000055",
  "b2000001-0001-4000-8000-000000000056",
  "b2000001-0001-4000-8000-000000000057",
  "b2000001-0001-4000-8000-000000000058",
]);

function slugCode(text, i) {
  const base = String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return base || `criterion_${i}`;
}

function sqlStr(s) {
  if (s == null) return "NULL";
  return `'${String(s).replace(/'/g, "''")}'`;
}

function sqlJson(obj) {
  if (obj == null) return "NULL::jsonb";
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

function inferRule(criterion, metDefault) {
  const lower = criterion.toLowerCase();
  if (/inadmissib|misrepresent|refusal|removal|deport|criminal|ban|overstay/.test(lower)) {
    return { senior_review_if: { equals: true }, block_if: { equals: true }, outcome_if_fail: "senior_review" };
  }
  if (/health|character|police|medical|tuberculosis|x-ray/.test(lower)) {
    return { warn_if: { equals: false }, allows_pending: true };
  }
  if (/disclosed|declaration|history/.test(lower)) {
    return { warn_if: { equals: false } };
  }
  if (/evidence|document|proof|funds|financial|insurance|admission|offer|sponsor/.test(lower)) {
    return { warn_if: { equals: false }, allows_pending: true };
  }
  if (metDefault === false) {
    return { warn_if: { equals: false }, allows_pending: true };
  }
  return { block_if: { equals: false }, outcome_if_fail: "not_yet" };
}

function buildQuestions(libraryId, meta) {
  const rows = [];
  const usedCodes = new Set();
  let order = 10;

  for (const [i, row] of (meta.eligibility ?? []).entries()) {
    const criterion = row.criterion?.trim();
    if (!criterion) continue;
    let code = slugCode(criterion, i);
    while (usedCodes.has(code)) code = `${code}_${i}`;
    usedCodes.add(code);
    const rule = inferRule(criterion, row.met);
    const allowsPending = !!rule.allows_pending;
    delete rule.allows_pending;
    rows.push({
      library_id: libraryId, code, section: "eligibility",
      label: `Does the client meet: ${criterion}?`,
      help_text: row.note?.trim() || null, q_type: "yes_no", options: null,
      conditional_on: null, rule, prefill_field: null,
      allows_pending_note: allowsPending, sort_order: order,
    });
    order += 10;
  }

  if (!usedCodes.has("passport_valid")) {
    rows.push({
      library_id: libraryId, code: "passport_valid", section: "documents",
      label: "Is the passport valid for the expected processing period?",
      help_text: "Check expiry against expected decision timeline.",
      q_type: "yes_no", options: null, conditional_on: null,
      rule: { warn_if: { equals: false }, allows_pending: true },
      prefill_field: "clients.passport_expiry", allows_pending_note: true, sort_order: order,
    });
    order += 10;
  }
  if (!usedCodes.has("prior_refusals")) {
    rows.push({
      library_id: libraryId, code: "prior_refusals", section: "compliance",
      label: "Any prior visa refusals, overstays, or undeclared immigration history?",
      help_text: "Full disclosure required before lodging.",
      q_type: "yes_no", options: null, conditional_on: null,
      rule: { senior_review_if: { equals: true }, block_if: { equals: true }, outcome_if_fail: "senior_review" },
      prefill_field: null, allows_pending_note: false, sort_order: order,
    });
    order += 10;
  }
  if (!usedCodes.has("counselor_ready")) {
    rows.push({
      library_id: libraryId, code: "counselor_ready", section: "submission",
      label: "Has the counselor confirmed the file is complete and ready to lodge?",
      help_text: "Final quality check before submission.",
      q_type: "yes_no", options: null, conditional_on: null,
      rule: { warn_if: { equals: false } },
      prefill_field: null, allows_pending_note: false, sort_order: order,
    });
  }
  return rows;
}

function rowToValues(r) {
  const rule = { ...r.rule };
  if (r.allows_pending_note) rule.allows_pending = true;
  return `(${sqlStr(r.library_id)}::uuid, ${sqlStr(r.code)}, ${sqlStr(r.section)}, ${sqlStr(r.label)}, ${sqlStr(r.help_text)}, ${sqlStr(r.q_type)}, ${sqlJson(r.options)}, ${sqlJson(r.conditional_on)}, ${sqlJson(rule)}, ${sqlStr(r.prefill_field)}, ${r.allows_pending_note}, ${r.sort_order})`;
}

function regionFor(file) {
  const p = file.split("-")[0];
  const map = {
    canada: "01-canada", uk: "02-uk", usa: "03-usa", australia: "04-australia",
    germany: "05-germany", nz: "06-nz", france: "07-eu-france", italy: "07-eu-italy",
    netherlands: "07-eu-netherlands", ireland: "07-eu-ireland", spain: "07-eu-spain",
    malta: "07-eu-malta", finland: "07-eu-finland", sweden: "07-eu-sweden",
    austria: "07-eu-austria", belgium: "07-eu-belgium", denmark: "07-eu-denmark",
    portugal: "07-eu-portugal",
    cyprus: "07-eu-cyprus",
    lithuania: "07-eu-lithuania",
    poland: "07-eu-poland",
    hungary: "07-eu-hungary",
    latvia: "07-eu-latvia",
    singapore: "10-singapore",
    uae: "09-uae",
  };
  return map[p] ?? "08-other";
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const visaFiles = Object.entries(LIBRARY_IDS).filter(([f]) => !f.startsWith("coaching-"));
const byRegion = new Map();

for (const [file, id] of visaFiles) {
  if (SETTLE_ABROAD_IDS.has(id) || HAND_CRAFTED_IDS.has(id)) continue;
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) continue;
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  const qs = buildQuestions(id, meta);
  if (!qs.length) continue;
  const region = regionFor(file);
  if (!byRegion.has(region)) byRegion.set(region, []);
  byRegion.get(region).push(...qs);
}

for (const [region, rows] of [...byRegion.entries()].sort()) {
  const sql = [
    `-- Eligibility questions: ${region}`,
    `-- Regenerate: node scripts/generate-eligibility-questions-sql-split.mjs`,
  "",
    "INSERT INTO public.service_eligibility_questions",
    "  (library_id, code, section, label, help_text, q_type, options, conditional_on, rule, prefill_field, allows_pending_note, sort_order)",
    "SELECT v.library_id, v.code, v.section, v.label, v.help_text, v.q_type, v.options, v.conditional_on, v.rule, v.prefill_field, v.allows_pending_note, v.sort_order",
    "FROM (VALUES",
    rows.map((r) => `  ${rowToValues(r)}`).join(",\n"),
    ") AS v(library_id, code, section, label, help_text, q_type, options, conditional_on, rule, prefill_field, allows_pending_note, sort_order)",
    "WHERE NOT EXISTS (",
    "  SELECT 1 FROM public.service_eligibility_questions q",
    "  WHERE q.library_id = v.library_id AND q.code = v.code",
    ");",
    "",
  ].join("\n");
  const outPath = path.join(OUT_DIR, `${region}.sql`);
  fs.writeFileSync(outPath, sql);
  console.log(`✓ ${region}.sql — ${rows.length} questions (${(sql.length / 1024).toFixed(0)} KB)`);
}
