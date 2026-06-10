#!/usr/bin/env node
/**
 * Generate service_eligibility_questions seeds from academy_metadata.eligibility in JSON.
 *
 *   node scripts/generate-eligibility-questions-sql.mjs
 *   → supabase/migrations/20260610360000_seed_all_visa_eligibility_questions.sql
 *
 * Skips services that use the full Settle Abroad assessment (settleAbroadBridge.ts).
 */
import fs from "fs";
import path from "path";
import { LIBRARY_IDS } from "./lib/service-library-ids.mjs";

const ROOT = path.join(process.cwd(), "content/service-library");
/**
 * @deprecated Use node scripts/generate-eligibility-questions-sql-split.mjs instead.
 * Monolithic output (~150 KB) may exceed Lovable SQL editor limits.
 */
const OUT = path.join(process.cwd(), "supabase/migrations/eligibility-seed/_DEPRECATED_monolithic.sql");

/** Already have hand-crafted questions in earlier migrations — do not auto-generate. */
const HAND_CRAFTED_IDS = new Set([
  "b2000001-0001-4000-8000-000000000017", // BOWP
  "b2000001-0001-4000-8000-000000000013", // Express Entry (also Settle Abroad)
]);

/** Keep in sync with src/lib/service-eligibility/settleAbroadBridge.ts */
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
    return {
      senior_review_if: { equals: true },
      block_if: { equals: true },
      outcome_if_fail: "senior_review",
    };
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
      library_id: libraryId,
      code,
      section: "eligibility",
      label: `Does the client meet: ${criterion}?`,
      help_text: row.note?.trim() || null,
      q_type: "yes_no",
      options: null,
      conditional_on: null,
      rule,
      prefill_field: null,
      allows_pending_note: allowsPending,
      sort_order: order,
    });
    order += 10;
  }

  if (!usedCodes.has("passport_valid")) {
    rows.push({
      library_id: libraryId,
      code: "passport_valid",
      section: "documents",
      label: "Is the passport valid for the expected processing period?",
      help_text: "Check expiry against expected decision timeline.",
      q_type: "yes_no",
      options: null,
      conditional_on: null,
      rule: { warn_if: { equals: false }, allows_pending: true },
      prefill_field: "clients.passport_expiry",
      allows_pending_note: true,
      sort_order: order,
    });
    order += 10;
  }

  if (!usedCodes.has("prior_refusals")) {
    rows.push({
      library_id: libraryId,
      code: "prior_refusals",
      section: "compliance",
      label: "Any prior visa refusals, overstays, or undeclared immigration history?",
      help_text: "Full disclosure required before lodging.",
      q_type: "yes_no",
      options: null,
      conditional_on: null,
      rule: {
        senior_review_if: { equals: true },
        block_if: { equals: true },
        outcome_if_fail: "senior_review",
      },
      prefill_field: null,
      allows_pending_note: false,
      sort_order: order,
    });
    order += 10;
  }

  if (!usedCodes.has("counselor_ready")) {
    rows.push({
      library_id: libraryId,
      code: "counselor_ready",
      section: "submission",
      label: "Has the counselor confirmed the file is complete and ready to lodge?",
      help_text: "Final quality check before submission.",
      q_type: "yes_no",
      options: null,
      conditional_on: null,
      rule: { warn_if: { equals: false } },
      prefill_field: null,
      allows_pending_note: false,
      sort_order: order,
    });
  }

  return rows;
}

function rowToValues(r) {
  const rule = { ...r.rule };
  if (r.allows_pending_note) rule.allows_pending = true;
  return `(${sqlStr(r.library_id)}::uuid, ${sqlStr(r.code)}, ${sqlStr(r.section)}, ${sqlStr(r.label)}, ${sqlStr(r.help_text)}, ${sqlStr(r.q_type)}, ${sqlJson(r.options)}, ${sqlJson(r.conditional_on)}, ${sqlJson(rule)}, ${sqlStr(r.prefill_field)}, ${r.allows_pending_note}, ${r.sort_order})`;
}

const visaFiles = Object.entries(LIBRARY_IDS).filter(([f]) => !f.startsWith("coaching-"));
const allRows = [];
const skipped = [];

for (const [file, id] of visaFiles) {
  if (SETTLE_ABROAD_IDS.has(id)) {
    skipped.push({ file, id, reason: "settle_abroad" });
    continue;
  }
  if (HAND_CRAFTED_IDS.has(id)) {
    skipped.push({ file, id, reason: "hand_crafted" });
    continue;
  }
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) {
    skipped.push({ file, id, reason: "missing_json" });
    continue;
  }
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  const qs = buildQuestions(id, meta);
  if (!qs.length) {
    skipped.push({ file, id, reason: "no_eligibility_criteria" });
    continue;
  }
  allRows.push(...qs);
}

const parts = [
  "-- Per-service eligibility assessment questions for all Visa & Immigration services",
  "-- Regenerate: node scripts/generate-eligibility-questions-sql.mjs",
  `-- Services seeded: ${visaFiles.length - skipped.length} · skipped (Settle Abroad): ${skipped.filter((s) => s.reason === "settle_abroad").length}`,
  "",
  "INSERT INTO public.service_eligibility_questions",
  "  (library_id, code, section, label, help_text, q_type, options, conditional_on, rule, prefill_field, allows_pending_note, sort_order)",
  "SELECT v.library_id, v.code, v.section, v.label, v.help_text, v.q_type, v.options, v.conditional_on, v.rule, v.prefill_field, v.allows_pending_note, v.sort_order",
  "FROM (VALUES",
  allRows.map((r) => `  ${rowToValues(r)}`).join(",\n"),
  ") AS v(library_id, code, section, label, help_text, q_type, options, conditional_on, rule, prefill_field, allows_pending_note, sort_order)",
  "WHERE NOT EXISTS (",
  "  SELECT 1 FROM public.service_eligibility_questions q",
  "  WHERE q.library_id = v.library_id AND q.code = v.code",
  ");",
  "",
  "-- Verify: services missing interactive eligibility questions",
  `-- SELECT sl.id, sl.sub_service, COUNT(q.id) AS question_count`,
  `-- FROM public.service_library sl`,
  `-- LEFT JOIN public.service_eligibility_questions q ON q.library_id = sl.id AND q.is_active`,
  `-- WHERE sl.service_category = 'visa_immigration' AND sl.is_active`,
  `-- GROUP BY sl.id, sl.sub_service HAVING COUNT(q.id) = 0`,
  `-- ORDER BY sl.sub_service;`,
  "",
];

fs.writeFileSync(OUT, parts.join("\n"));
console.log(`Wrote ${OUT}`);
console.log(`  Questions: ${allRows.length}`);
console.log(`  Services: ${visaFiles.length - skipped.length}`);
console.log(`  Skipped: ${skipped.length}`);
