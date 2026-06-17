#!/usr/bin/env node
/**
 * Audit Service Library completeness across all country → service records.
 *
 * Usage:
 *   node scripts/audit-service-library-completeness.mjs
 *   node scripts/audit-service-library-completeness.mjs --live   # requires SUPABASE_SERVICE_ROLE_KEY
 *
 * Outputs:
 *   reports/service-library-audit-latest.json
 *   reports/service-library-audit-latest.md
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { LIBRARY_IDS } from "./lib/service-library-ids.mjs";
import {
  auditServiceRow,
  findDuplicates,
  findFaqDuplicates,
  summarizeAudits,
  THRESHOLDS,
} from "./lib/service-library-audit.mjs";

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "content/service-library");
const REPORTS_DIR = path.join(ROOT, "reports");
const LIVE = process.argv.includes("--live");

const SKIP_FILES = new Set([
  "bulk-upload.json",
  "bulk-upload.example.json",
  "canada-bulk-upload.json",
  "metadata-template.json",
  "mbbs-tuition-data.json",
]);

function inferCategory(file) {
  if (file.startsWith("coaching-")) return "coaching";
  if (file.startsWith("mbbs-")) return "mbbs_services";
  return "visa_immigration";
}

function inferCountries(file) {
  const slug = file.replace(/\.json$/, "");
  const parts = slug.split("-");
  const multi = {
    "south-korea": "South Korea",
    "new-zealand": "New Zealand",
  };
  for (const [k, v] of Object.entries(multi)) {
    if (slug.startsWith(k)) return [v];
  }
  const countryMap = {
    canada: "Canada",
    uk: "United Kingdom",
    usa: "United States",
    australia: "Australia",
    germany: "Germany",
    nz: "New Zealand",
    france: "France",
    italy: "Italy",
    netherlands: "Netherlands",
    ireland: "Ireland",
    spain: "Spain",
    malta: "Malta",
    finland: "Finland",
    sweden: "Sweden",
    austria: "Austria",
    belgium: "Belgium",
    denmark: "Denmark",
    portugal: "Portugal",
    cyprus: "Cyprus",
    lithuania: "Lithuania",
    uae: "UAE",
    poland: "Poland",
    hungary: "Hungary",
    latvia: "Latvia",
    singapore: "Singapore",
    "south-korea": "South Korea",
  };
  const first = parts[0];
  return countryMap[first] ? [countryMap[first]] : [];
}

function loadRepoAudits() {
  const audits = [];
  const withMeta = [];

  for (const [file, id] of Object.entries(LIBRARY_IDS)) {
    const fp = path.join(CONTENT_DIR, file);
    if (!fs.existsSync(fp)) {
      audits.push(
        auditServiceRow({
          id,
          file,
          service_category: inferCategory(file),
          sub_service: file,
          countries: inferCountries(file),
          meta: {},
        }),
      );
      continue;
    }

    const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
    delete meta._instructions;
    const audit = auditServiceRow({
      id,
      file,
      service_category: inferCategory(file),
      sub_service: meta.displayName ?? file,
      countries: inferCountries(file),
      meta,
      process_flow: null,
      cost_summary_html: null,
      feeItemCount: 0,
      submissionChecklistCount: 0,
      visaFormCount: 0,
      checklistFileCount: 0,
    });
    audits.push(audit);
    withMeta.push({ audit, meta });
  }

  // JSON files without LIBRARY_IDS mapping
  const mappedFiles = new Set(Object.keys(LIBRARY_IDS));
  for (const file of fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".json"))) {
    if (SKIP_FILES.has(file) || mappedFiles.has(file)) continue;
    const meta = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, file), "utf8"));
    delete meta._instructions;
    const audit = auditServiceRow({
      id: "(unmapped)",
      file,
      service_category: inferCategory(file),
      sub_service: meta.displayName ?? file,
      countries: inferCountries(file),
      meta,
    });
    audits.push(audit);
    withMeta.push({ audit, meta });
  }

  return { audits, withMeta };
}

async function loadLiveData() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("Live mode skipped: set VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }

  const sb = createClient(url, key);
  const { data: masters, error } = await sb
    .from("service_library")
    .select(
      `id, service_category, service, sub_service, is_active,
       academy_metadata, process_flow, cost_summary_html, checklist_text,
       service_library_countries(country)`,
    )
    .eq("is_active", true)
    .order("service_category")
    .order("service")
    .order("sub_service");

  if (error) throw new Error(error.message);

  const ids = (masters ?? []).map((m) => m.id);
  const [fees, subs, vforms, cfiles, overrides] = await Promise.all([
    sb.from("service_library_fee_items").select("library_id").in("library_id", ids),
    sb.from("service_library_submission_checklist").select("library_id").in("library_id", ids).eq("is_active", true),
    sb.from("service_library_visa_form_files").select("library_id").in("library_id", ids).eq("is_current", true),
    sb.from("service_library_checklist_files").select("library_id").in("library_id", ids).eq("is_current", true),
    sb.from("service_library_overrides").select("library_id").in("library_id", ids),
  ]);

  const countBy = (rows) => {
    const m = new Map();
    for (const r of rows ?? []) {
      m.set(r.library_id, (m.get(r.library_id) ?? 0) + 1);
    }
    return m;
  };

  const feeCounts = countBy(fees.data);
  const subCounts = countBy(subs.data);
  const vfCounts = countBy(vforms.data);
  const cfCounts = countBy(cfiles.data);
  const ovCounts = countBy(overrides.data);

  const idToFile = Object.fromEntries(
    Object.entries(LIBRARY_IDS).map(([f, id]) => [id, f]),
  );

  const audits = [];
  const withMeta = [];

  for (const m of masters ?? []) {
    const meta = m.academy_metadata ?? {};
    const audit = auditServiceRow({
      id: m.id,
      file: idToFile[m.id] ?? "(no repo json)",
      service_category: m.service_category,
      service: m.service,
      sub_service: m.sub_service,
      countries: (m.service_library_countries ?? []).map((c) => c.country),
      meta,
      process_flow: m.process_flow,
      cost_summary_html: m.cost_summary_html,
      feeItemCount: feeCounts.get(m.id) ?? 0,
      submissionChecklistCount: subCounts.get(m.id) ?? 0,
      visaFormCount: vfCounts.get(m.id) ?? 0,
      checklistFileCount: cfCounts.get(m.id) ?? 0,
      overrideCount: ovCounts.get(m.id) ?? 0,
    });
    audits.push(audit);
    withMeta.push({ audit, meta });
  }

  return { audits, withMeta, source: "live" };
}

function formatMarkdown(report) {
  const lines = [];
  const { summary, audits, duplicates, faqDuplicates, source, generatedAt } = report;

  lines.push("# Service Library completeness audit");
  lines.push("");
  lines.push(`**Generated:** ${generatedAt}`);
  lines.push(`**Source:** ${source}`);
  lines.push(`**Records scanned:** ${summary.total}`);
  lines.push(`**Metadata complete (JSON):** ${summary.metadataComplete} · **Metadata gaps:** ${summary.metadataIncomplete}`);
  lines.push(`**Fully complete (incl. DB):** ${summary.complete} · **Any gaps:** ${summary.incomplete}`);
  if (source.includes("repo JSON")) {
    lines.push("");
    lines.push("> DB-only checks (fees table, submission checklist, visa forms, checklist PDFs, process_flow) require `--live` or SQL audit.");
  }
  lines.push("");
  lines.push("## Thresholds");
  lines.push("");
  lines.push(`| Check | Target |`);
  lines.push(`|-------|--------|`);
  for (const [k, v] of Object.entries(THRESHOLDS)) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push("");
  lines.push("## Gap frequency (all services)");
  lines.push("");
  lines.push("| Gap | Services affected |");
  lines.push("|-----|-------------------|");
  for (const [gap, count] of Object.entries(summary.gapCounts)) {
    lines.push(`| ${gap} | ${count} |`);
  }
  lines.push("");
  lines.push("## Services with metadata gaps (JSON content)");
  lines.push("");

  const metaIncomplete = audits
    .filter((a) => !a.metadataComplete)
    .sort((a, b) => b.metadataIssueCount - a.metadataIssueCount || a.displayName.localeCompare(b.displayName));

  for (const a of metaIncomplete) {
    lines.push(`### ${a.displayName}`);
    lines.push("");
    lines.push(`- **ID:** \`${a.id}\``);
    lines.push(`- **File:** ${a.file}`);
    lines.push(`- **Category:** ${a.service_category}`);
    if (a.countries.length) lines.push(`- **Countries:** ${a.countries.join(", ")}`);
    lines.push(`- **Issues (metadata):** ${a.metadataIssueCount}`);
    lines.push(`- **Counts:** FAQs ${a.counts.faqs}, Quiz ${a.counts.quiz}, Red flags ${a.counts.redFlags}, Fees ${a.counts.feeItems}, Checklist items ${a.counts.submissionChecklist}, Visa forms ${a.counts.visaForms}, Checklist PDFs ${a.counts.checklistFiles}`);
    if (a.emptySections.length) lines.push(`- **Empty sections:** ${a.emptySections.join(", ")}`);
    if (a.belowThreshold.length) lines.push(`- **Below threshold:** ${a.belowThreshold.join(", ")}`);
    if (a.missingVerificationDates.length) lines.push(`- **Missing verification dates:** ${a.missingVerificationDates.join(", ")}`);
    if (a.dbGaps.length) lines.push(`- **DB / operational gaps:** ${a.dbGaps.join(", ")}`);
    lines.push("");
  }

  if (duplicates.length) {
    lines.push("## Duplicate / near-duplicate content groups");
    lines.push("");
    for (const d of duplicates.slice(0, 20)) {
      lines.push(`- **${d.services.join(" · ")}** (${d.files.join(", ")})`);
    }
    if (duplicates.length > 20) lines.push(`- …and ${duplicates.length - 20} more groups`);
    lines.push("");
  }

  if (faqDuplicates.length) {
    lines.push("## Shared FAQ questions across services (top 30)");
    lines.push("");
    for (const f of faqDuplicates.slice(0, 30)) {
      lines.push(`- "${f.question.slice(0, 80)}${f.question.length > 80 ? "…" : ""}" → ${f.services.length} services: ${f.services.slice(0, 5).join(", ")}${f.services.length > 5 ? "…" : ""}`);
    }
    lines.push("");
  }

  const complete = audits.filter((a) => a.complete);
  if (complete.length) {
    lines.push("## Fully complete services");
    lines.push("");
    for (const a of complete.sort((x, y) => x.displayName.localeCompare(y.displayName))) {
      lines.push(`- ${a.displayName} (\`${a.id}\`)`);
    }
  }

  return lines.join("\n");
}

async function main() {
  let audits;
  let withMeta;
  let source;

  if (LIVE) {
    const live = await loadLiveData();
    if (live) {
      ({ audits, withMeta } = live);
      source = "live Supabase";
    } else {
      ({ audits, withMeta } = loadRepoAudits());
      source = "repo JSON (live skipped — no service role key)";
    }
  } else {
    ({ audits, withMeta } = loadRepoAudits());
    source = "repo JSON (use --live for Supabase DB tables)";
  }

  const { duplicateGroups } = findDuplicates(audits);
  const faqDuplicates = findFaqDuplicates(withMeta);
  const summary = summarizeAudits(audits);

  const report = {
    generatedAt: new Date().toISOString(),
    source,
    thresholds: THRESHOLDS,
    summary,
    duplicates: duplicateGroups,
    faqDuplicates: faqDuplicates.slice(0, 100),
    audits: audits.sort((a, b) => b.issueCount - a.issueCount || a.displayName.localeCompare(b.displayName)),
  };

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const jsonPath = path.join(REPORTS_DIR, "service-library-audit-latest.json");
  const mdPath = path.join(REPORTS_DIR, "service-library-audit-latest.md");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, formatMarkdown(report));

  console.log(`Scanned ${audits.length} services (${source})`);
  console.log(`Metadata complete: ${summary.metadataComplete} | Metadata gaps: ${summary.metadataIncomplete}`);
  console.log(`Fully complete (incl DB): ${summary.complete} | Any gaps: ${summary.incomplete}`);
  console.log(`Duplicate content groups: ${duplicateGroups.length}`);
  console.log(`Shared FAQ questions: ${faqDuplicates.length}`);
  console.log(`Wrote ${mdPath}`);
  console.log(`Wrote ${jsonPath}`);

  // Console top gaps
  console.log("\nTop gaps:");
  for (const [gap, count] of Object.entries(summary.gapCounts).slice(0, 15)) {
    console.log(`  ${count}\t${gap}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
