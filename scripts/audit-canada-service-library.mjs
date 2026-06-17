#!/usr/bin/env node
/**
 * Canada Service Library inventory report (read-only — does not modify content).
 *
 * Usage: node scripts/audit-canada-service-library.mjs
 *
 * Outputs:
 *   reports/canada-service-library-inventory.md
 *   reports/canada-service-library-inventory.json
 */
import fs from "fs";
import path from "path";
import { LIBRARY_IDS } from "./lib/service-library-ids.mjs";
import { auditServiceRow, THRESHOLDS } from "./lib/service-library-audit.mjs";

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content/service-library");
const REPORTS = path.join(ROOT, "reports");

const GENERIC_FAQ_PATTERNS = [
  /^what is description for this service/i,
  /^what is eligible applicants for this service/i,
  /^what is key authority for this service/i,
  /^what is after approval for this service/i,
  /^what is application streams for this service/i,
  /^what is inland vs outland for this service/i,
  /^what is single vs multiple entry for this service/i,
  /^what is duration rules for this service/i,
  /^what is the processing time\??$/i,
  /^what is the government fee\??$/i,
  /^what is the our approval rate\??$/i,
  /^what is the required docs\??$/i,
  /^what is the consultancy fee\??$/i,
  /^important note on /i,
];

const PLACEHOLDER_TEXT = [/\{[^}]+\}/, /placeholder/i, /lorem ipsum/i, /\btbd\b/i, /\btodo\b/i];

/** Business priority: P1 high volume/revenue, P2 medium, P3 niche */
const CANADA_PRIORITY = {
  "canada-student-visa.json": { priority: 1, business: 100, volume: 100, label: "Study Permit (outside Canada)" },
  "canada-visitor-visa.json": { priority: 1, business: 95, volume: 95, label: "Visitor Visa (TRV)" },
  "canada-spouse-visa.json": { priority: 1, business: 90, volume: 85, label: "Spouse / Partner Sponsorship" },
  "canada-pgwp.json": { priority: 1, business: 88, volume: 80, label: "Post-Graduation Work Permit" },
  "canada-work-permit.json": { priority: 1, business: 85, volume: 75, label: "Work Permit (LMIA / exempt)" },
  "canada-express-entry-pr.json": { priority: 1, business: 92, volume: 70, label: "Express Entry PR" },
  "canada-super-visa.json": { priority: 2, business: 70, volume: 55, label: "Super Visa (parents/grandparents)" },
  "canada-study-permit-extension.json": { priority: 2, business: 75, volume: 65, label: "Study Permit Extension" },
  "canada-spouse-dependent-owp.json": { priority: 2, business: 68, volume: 50, label: "Spouse OWP (dependent)" },
  "canada-spouse-dependent-extension.json": { priority: 2, business: 65, volume: 45, label: "Spouse Permit Extension" },
  "canada-spouse-dependent-visitor.json": { priority: 2, business: 60, volume: 40, label: "Spouse Visitor Record" },
  "canada-oinp.json": { priority: 2, business: 72, volume: 45, label: "Ontario PNP (OINP)" },
  "canada-pnp-program.json": { priority: 2, business: 70, volume: 42, label: "Provincial Nominee Program (general)" },
  "canada-tr-to-pr.json": { priority: 2, business: 68, volume: 38, label: "TR to PR Pathway" },
  "canada-bowp.json": { priority: 3, business: 55, volume: 30, label: "Bridging Open Work Permit" },
  "canada-visitor-record.json": { priority: 3, business: 50, volume: 28, label: "Visitor Record Extension" },
  "canada-caips-notes.json": { priority: 3, business: 45, volume: 20, label: "CAIPS / GCMS Notes" },
};

const ALL_SECTIONS = [
  "Overview (about, kpis, performance)",
  "Eligibility",
  "Red flags",
  "FAQs",
  "Compliance",
  "Pro tips / counsellor guidance",
  "Post-approval",
  "Do's & don'ts",
  "Process (timeline / process_flow)",
  "Resources (official links)",
  "Sample documents",
  "Quiz",
  "Fees (feeBreakdown / consultancyBreakdown)",
  "Cost breakdown (fullCostBreakdown)",
  "Working rights (applicant & spouse)",
  "Verification dates",
  "Changelog / staff notes",
  "Submission checklist (DB)",
  "Visa forms (DB)",
  "Checklist PDFs (DB)",
];

function isGenericFaq(q) {
  return GENERIC_FAQ_PATTERNS.some((re) => re.test((q ?? "").trim()));
}

function detectPlaceholders(meta) {
  const hits = [];
  for (const f of meta.faqs ?? []) {
    const q = f.q ?? "";
    const a = f.a ?? "";
    if (isGenericFaq(q)) hits.push({ type: "generic_template_faq", field: "faqs", text: q });
    if (PLACEHOLDER_TEXT.some((re) => re.test(a))) hits.push({ type: "placeholder_text", field: "faqs.answer", text: q });
    if (isGenericFaq(q) && !/canada|ircc|gckey|biometric|study permit|visitor|spouse|pgwp|express entry|super visa|bowp|oinp|pnp|caips|work permit|lmia|sds|dli/i.test(a)) {
      hits.push({ type: "missing_country_specific_faq", field: "faqs", text: q });
    }
  }
  for (const r of meta.redFlags ?? []) {
    for (const [field, val] of Object.entries({ title: r.title, description: r.description, fix: r.fix })) {
      if (val && PLACEHOLDER_TEXT.some((re) => re.test(val))) {
        hits.push({ type: "placeholder_text", field: `redFlags.${field}`, text: r.title });
      }
    }
  }
  for (const tip of meta.proTips ?? []) {
    if (PLACEHOLDER_TEXT.some((re) => re.test(tip))) {
      hits.push({ type: "placeholder_text", field: "proTips", text: tip.slice(0, 100) });
    }
  }
  return hits;
}

function completenessScore(meta, audit) {
  const checks = [
    !audit.emptySections.includes("displayName"),
    !audit.emptySections.includes("shortDescription"),
    !audit.emptySections.includes("about"),
    !audit.emptySections.includes("eligibility"),
    !audit.emptySections.includes("redFlags"),
    !audit.emptySections.includes("faqs"),
    !audit.emptySections.includes("compliance"),
    !audit.emptySections.includes("proTips"),
    !audit.emptySections.includes("postApproval"),
    !audit.emptySections.includes("kpis (<3)"),
    !audit.emptySections.includes("resources"),
    !audit.emptySections.includes("quiz"),
    !audit.emptySections.includes("sampleDocs"),
    !audit.emptySections.includes("donts"),
    !audit.emptySections.includes("timeline (metadata)"),
    !audit.emptySections.includes("workingRights.applicant"),
    !audit.emptySections.includes("workingRights.spouse"),
    !audit.emptySections.includes("fullCostBreakdown.sections (<4)"),
    (meta.feeBreakdown?.items?.length ?? 0) > 0 || (meta.consultancyBreakdown?.packages?.length ?? 0) > 0,
    audit.counts.faqs >= THRESHOLDS.faqs,
    audit.counts.redFlags >= THRESHOLDS.redFlags,
    audit.counts.proTips >= THRESHOLDS.proTips,
    audit.counts.resources >= THRESHOLDS.resources,
    audit.counts.quiz >= THRESHOLDS.quiz,
    audit.missingVerificationDates.length === 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function qualityScore(meta, placeholders) {
  let score = 100;
  const genericCount = placeholders.filter((p) => p.type === "generic_template_faq").length;
  score -= genericCount * 4;
  score -= placeholders.filter((p) => p.type === "missing_country_specific_faq").length * 2;
  score -= placeholders.filter((p) => p.type === "placeholder_text").length * 8;
  const body = JSON.stringify(meta);
  if (!/canada|ircc/i.test(body)) score -= 25;
  return Math.max(0, Math.min(100, score));
}

function classify(meta, audit, completeness, quality, placeholders) {
  const genericFaqs = placeholders.filter((p) => p.type === "generic_template_faq").length;
  const hasEmptyCore = audit.emptySections.some((s) =>
    ["about", "eligibility", "redFlags", "faqs", "displayName"].some((c) => s.startsWith(c)),
  );

  if (completeness < 65 || hasEmptyCore || !meta.displayName) return "complete_rebuild";
  if (completeness < 85 || quality < 60 || audit.belowThreshold.length > 2) return "major_updates";
  if (completeness < 95 || quality < 85 || genericFaqs > 0) return "minor_updates";
  return "production_ready";
}

function riskLevel(priority, completeness, quality, audit, placeholders) {
  if (completeness < 65 || audit.emptySections.length > 5) return "Critical";
  if (priority.priority === 1 && (quality < 70 || placeholders.length > 4)) return "High";
  if (completeness < 90 || quality < 80 || audit.belowThreshold.length > 0) return "Medium";
  return "Low";
}

function missingSectionsList(meta, audit) {
  const missing = [];
  if (audit.emptySections.length) missing.push(...audit.emptySections);
  if (audit.belowThreshold.length) missing.push(...audit.belowThreshold);
  for (const g of audit.dbGaps) {
    if (g.includes("submission checklist")) missing.push("Submission checklist (DB)");
    if (g === "visa forms") missing.push("Visa forms (DB)");
    if (g === "checklist PDFs") missing.push("Checklist PDFs (DB)");
    if (g.includes("process_flow")) missing.push("Process flow (DB)");
    if (g.includes("cost_summary_html")) missing.push("Cost summary HTML (DB)");
    if (g.includes("fees")) missing.push("Fee items table (DB)");
  }
  return [...new Set(missing)];
}

function guidanceGaps(meta, audit, placeholders) {
  const gaps = [];
  if ((meta.proTips?.length ?? 0) < THRESHOLDS.proTips) gaps.push("Pro tips below target");
  if ((meta.staffNotes?.length ?? 0) === 0) gaps.push("No internal staff notes");
  if (!meta.donts?.dos?.length) gaps.push("Missing counsellor do's");
  if (!meta.donts?.donts?.length) gaps.push("Missing counsellor don'ts");
  if (!meta.donts?.mistakes?.length) gaps.push("Missing common mistakes");
  if (placeholders.some((p) => p.type === "generic_template_faq")) gaps.push("Template FAQs need Canada-specific rewrite");
  if (audit.counts.resources < THRESHOLDS.resources) gaps.push("Official resources below 4 links");
  if (audit.counts.sampleDocs === 0) gaps.push("No sample documents");
  return gaps;
}

function analyzeCanada() {
  const entries = Object.entries(LIBRARY_IDS).filter(([f]) => f.startsWith("canada-"));
  const results = [];
  const allFaqMap = new Map();

  for (const [file, id] of entries) {
    const fp = path.join(CONTENT, file);
    const slug = file.replace(/\.json$/, "");
    const pri = CANADA_PRIORITY[file] ?? { priority: 3, business: 40, volume: 30, label: slug };
    let meta = {};
    const fileExists = fs.existsSync(fp);
    if (fileExists) meta = JSON.parse(fs.readFileSync(fp, "utf8"));

    const audit = auditServiceRow({
      id,
      file,
      service_category: "visa_immigration",
      countries: ["Canada"],
      meta,
    });

    const placeholders = detectPlaceholders(meta);
    const genericFaqs = [...new Set(placeholders.filter((p) => p.type === "generic_template_faq").map((p) => p.text))];
    const completeness = completenessScore(meta, audit);
    const quality = qualityScore(meta, placeholders);
    const businessImportance = Math.round((pri.business + pri.volume) / 2);
    const category = classify(meta, audit, completeness, quality, placeholders);

    for (const f of meta.faqs ?? []) {
      const q = (f.q ?? "").trim().toLowerCase();
      if (!q) continue;
      if (!allFaqMap.has(q)) allFaqMap.set(q, []);
      allFaqMap.get(q).push(meta.displayName ?? slug);
    }

    const processFlowStatus =
      (meta.timeline?.length ?? 0) >= THRESHOLDS.timeline
        ? `Complete — ${meta.timeline.length} timeline steps in metadata`
        : (meta.timeline?.length ?? 0) > 0
          ? `Partial — ${meta.timeline.length}/${THRESHOLDS.timeline} timeline steps`
          : "Missing — no timeline in metadata; DB process_flow not scanned";

    const feeStatus =
      (meta.feeBreakdown?.items?.length ?? 0) > 0
        ? `Complete — ${meta.feeBreakdown.items.length} govt fee items (verified: ${meta.feeBreakdown.lastVerified ?? "missing"})`
        : (meta.consultancyBreakdown?.packages?.length ?? 0) > 0
          ? `Partial — consultancy packages only (${meta.consultancyBreakdown.packages.length})`
          : audit.counts.kpis >= 3
            ? "Partial — KPI fee values only; no itemised feeBreakdown"
            : "Missing";

    const costStatus =
      (meta.fullCostBreakdown?.sections?.length ?? 0) >= THRESHOLDS.fullCostSections
        ? `Complete — ${meta.fullCostBreakdown.sections.length} sections (verified: ${meta.fullCostBreakdown.lastVerified ?? "missing"})`
        : (meta.fullCostBreakdown?.sections?.length ?? 0) > 0
          ? `Partial — ${meta.fullCostBreakdown.sections.length}/${THRESHOLDS.fullCostSections} sections`
          : "Missing";

    const verifyParts = [];
    if (meta.feeBreakdown?.lastVerified) verifyParts.push(`fees: ${meta.feeBreakdown.lastVerified}`);
    if (meta.consultancyBreakdown?.lastVerified) verifyParts.push(`consultancy: ${meta.consultancyBreakdown.lastVerified}`);
    if (meta.fullCostBreakdown?.lastVerified) verifyParts.push(`costs: ${meta.fullCostBreakdown.lastVerified}`);
    if (meta.workingRights?.applicant?.lastVerified) verifyParts.push(`applicant rights: ${meta.workingRights.applicant.lastVerified}`);
    if (meta.workingRights?.spouse?.lastVerified) verifyParts.push(`spouse rights: ${meta.workingRights.spouse.lastVerified}`);
    if (meta.policyAlert?.date) verifyParts.push(`policy alert: ${meta.policyAlert.date}`);
    const verifyStatus =
      audit.missingVerificationDates.length === 0
        ? verifyParts.length ? `Complete — ${verifyParts.join("; ")}` : "Partial — no lastVerified fields but no mandatory gaps"
        : `Incomplete — missing: ${audit.missingVerificationDates.join(", ")}`;

    results.push({
      serviceName: meta.displayName ?? pri.label,
      serviceId: id,
      slug,
      file,
      fileExists,
      priority: pri.priority,
      priorityLabel: `Priority ${pri.priority}`,
      businessLabel: pri.label,
      completionScore: completeness,
      contentQualityScore: quality,
      businessImportanceScore: businessImportance,
      missingSections: missingSectionsList(meta, audit),
      emptySections: audit.emptySections,
      placeholderContent: placeholders,
      genericTemplateFaqs: genericFaqs,
      faqCount: audit.counts.faqs,
      redFlagsCount: audit.counts.redFlags,
      proTipsCount: (meta.proTips ?? []).length,
      resourcesCount: audit.counts.resources,
      sampleDocumentsCount: audit.counts.sampleDocs,
      processFlowStatus: processFlowStatus,
      feeInformationStatus: feeStatus,
      costBreakdownStatus: costStatus,
      verificationInformationStatus: verifyStatus,
      lastUpdatedDate: meta.updatedLabel ?? meta.policyAlert?.date ?? "Unknown",
      riskLevel: riskLevel(pri, completeness, quality, audit, placeholders),
      workCategory: category,
      counsellorGuidanceGaps: guidanceGaps(meta, audit, placeholders),
      counts: audit.counts,
      dbGapsNote: audit.dbGaps,
    });
  }

  results.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.businessImportanceScore - a.businessImportanceScore;
  });

  const crossCanadaDupes = [...allFaqMap.entries()]
    .filter(([, services]) => services.length > 1)
    .map(([question, services]) => ({ question, services: [...new Set(services)], isGeneric: isGenericFaq(question) }))
    .sort((a, b) => b.services.length - a.services.length);

  return {
    generatedAt: new Date().toISOString(),
    source: "content/service-library/canada-*.json (repo JSON — DB tables not queried)",
    sectionChecklist: ALL_SECTIONS,
    services: results,
    crossCanadaDuplicateFaqs: crossCanadaDupes,
    summary: {
      totalCanadaServices: results.length,
      productionReady: results.filter((r) => r.workCategory === "production_ready").length,
      minorUpdates: results.filter((r) => r.workCategory === "minor_updates").length,
      majorUpdates: results.filter((r) => r.workCategory === "major_updates").length,
      completeRebuild: results.filter((r) => r.workCategory === "complete_rebuild").length,
      withGenericTemplateFaqs: results.filter((r) => r.genericTemplateFaqs.length > 0).length,
      criticalRisk: results.filter((r) => r.riskLevel === "Critical").length,
      highRisk: results.filter((r) => r.riskLevel === "High").length,
    },
  };
}

function formatMarkdown(report) {
  const lines = [];
  const { summary, services, crossCanadaDuplicateFaqs } = report;

  lines.push("# Canada Service Library — Content Completion Inventory");
  lines.push("");
  lines.push(`**Generated:** ${report.generatedAt}`);
  lines.push(`**Source:** ${report.source}`);
  lines.push(`**Scope:** All Canada services in \`scripts/lib/service-library-ids.mjs\` (17 records)`);
  lines.push("");
  lines.push("> Read-only inventory. No content was generated or modified.");
  lines.push("> DB-only items (submission checklist, visa forms, checklist PDFs, `process_flow`) are flagged but not verified against live Supabase in this run.");
  lines.push("");

  lines.push("## Executive summary");
  lines.push("");
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Total Canada services | ${summary.totalCanadaServices} |`);
  lines.push(`| Ready for production | ${summary.productionReady} |`);
  lines.push(`| Requiring minor updates | ${summary.minorUpdates} |`);
  lines.push(`| Requiring major updates | ${summary.majorUpdates} |`);
  lines.push(`| Requiring complete rebuild | ${summary.completeRebuild} |`);
  lines.push(`| Services with generic template FAQs | ${summary.withGenericTemplateFaqs} |`);
  lines.push(`| Critical risk | ${summary.criticalRisk} |`);
  lines.push(`| High risk | ${summary.highRisk} |`);
  lines.push("");

  lines.push("## Cross-cutting issues (all Canada services)");
  lines.push("");
  lines.push("### Generic template FAQs (bulk-seed pattern)");
  lines.push("");
  lines.push("These FAQ questions appear across multiple Canada services and should be replaced with natural, Canada-specific Q&A:");
  lines.push("");
  const genericDupes = crossCanadaDuplicateFaqs.filter((d) => d.isGeneric).slice(0, 15);
  for (const d of genericDupes) {
    lines.push(`- **"${d.question}"** — ${d.services.length} Canada services`);
  }
  lines.push("");
  lines.push("### Duplicate FAQs within Canada catalogue");
  lines.push("");
  lines.push(`Total FAQ questions shared by 2+ Canada services: **${crossCanadaDuplicateFaqs.length}**`);
  lines.push("");
  lines.push("### Systemic gaps (repo JSON scan)");
  lines.push("");
  lines.push("- **Submission checklist (DB):** All 17 services — not in JSON; requires live DB audit");
  lines.push("- **Visa forms (DB):** All 17 services — not in JSON; requires Admin / DB seed");
  lines.push("- **Checklist PDFs (DB):** All 17 services — not in JSON; requires Admin upload");
  lines.push("- **Template FAQs:** Present in all 17 Canada JSON files (6–10 generic questions each, auto-generated from `about` + KPI labels)");
  lines.push("");

  for (const p of [1, 2, 3]) {
    const group = services.filter((s) => s.priority === p);
    if (!group.length) continue;
    lines.push(`## Priority ${p} — ${p === 1 ? "High Revenue / High Volume" : p === 2 ? "Medium Revenue / Medium Volume" : "Low Volume / Niche"}`);
    lines.push("");

    for (const s of group) {
      lines.push(`### ${s.serviceName}`);
      lines.push("");
      lines.push(`| Field | Value |`);
      lines.push(`|-------|-------|`);
      lines.push(`| Service ID | \`${s.serviceId}\` |`);
      lines.push(`| Slug | \`${s.slug}\` |`);
      lines.push(`| JSON file | \`${s.file}\` |`);
      lines.push(`| Completion score | **${s.completionScore}%** |`);
      lines.push(`| Content quality score | **${s.contentQualityScore}%** |`);
      lines.push(`| Business importance score | **${s.businessImportanceScore}%** |`);
      lines.push(`| Risk level | **${s.riskLevel}** |`);
      lines.push(`| Work category | ${s.workCategory.replace(/_/g, " ")} |`);
      lines.push(`| Last updated | ${s.lastUpdatedDate} |`);
      lines.push(`| FAQ count | ${s.faqCount} |`);
      lines.push(`| Red flags count | ${s.redFlagsCount} |`);
      lines.push(`| Pro tips count | ${s.proTipsCount} |`);
      lines.push(`| Resources count | ${s.resourcesCount} |`);
      lines.push(`| Sample documents count | ${s.sampleDocumentsCount} |`);
      lines.push(`| Process flow | ${s.processFlowStatus} |`);
      lines.push(`| Fee information | ${s.feeInformationStatus} |`);
      lines.push(`| Cost breakdown | ${s.costBreakdownStatus} |`);
      lines.push(`| Verification info | ${s.verificationInformationStatus} |`);
      lines.push("");

      if (s.emptySections.length) {
        lines.push(`**Empty sections:** ${s.emptySections.join(", ")}`);
        lines.push("");
      }
      if (s.missingSections.length) {
        lines.push(`**Missing / below threshold:** ${s.missingSections.join("; ")}`);
        lines.push("");
      }
      if (s.genericTemplateFaqs.length) {
        lines.push(`**Generic template FAQs detected (${s.genericTemplateFaqs.length}):**`);
        for (const q of s.genericTemplateFaqs) lines.push(`- ${q}`);
        lines.push("");
      }
      if (s.counsellorGuidanceGaps.length) {
        lines.push(`**Counsellor guidance gaps:** ${s.counsellorGuidanceGaps.join("; ")}`);
        lines.push("");
      }
      if (s.placeholderContent.filter((p) => p.type !== "generic_template_faq").length) {
        lines.push(`**Other placeholder content:** ${s.placeholderContent.filter((p) => p.type !== "generic_template_faq").map((p) => p.text).join("; ")}`);
        lines.push("");
      }
      lines.push("---");
      lines.push("");
    }
  }

  lines.push("## Recommended completion order");
  lines.push("");
  lines.push("Complete in this sequence to maximise counselor impact and revenue:");
  lines.push("");
  const order = [...services].sort((a, b) => {
    const scoreA = a.priority * 1000 + (100 - a.businessImportanceScore) + (100 - a.completionScore) + (100 - a.contentQualityScore);
    const scoreB = b.priority * 1000 + (100 - b.businessImportanceScore) + (100 - b.completionScore) + (100 - b.contentQualityScore);
    return scoreA - scoreB;
  });
  order.forEach((s, i) => {
    lines.push(`${i + 1}. **${s.serviceName}** (\`${s.slug}\`) — ${s.workCategory.replace(/_/g, " ")}, risk ${s.riskLevel}, completion ${s.completionScore}%, quality ${s.contentQualityScore}%`);
  });
  lines.push("");
  lines.push("### Phase plan");
  lines.push("");
  lines.push("**Phase 1 (Week 1–2):** Student Visa, Visitor Visa, Spouse Sponsorship — replace template FAQs, verify IRCC fees/dates, add DB checklists + visa forms");
  lines.push("**Phase 2 (Week 3):** PGWP, Work Permit, Express Entry — same FAQ cleanup + pathway-specific red flags");
  lines.push("**Phase 3 (Week 4):** Study Permit Extension, Super Visa, Spouse dependent family — dependent workflow content");
  lines.push("**Phase 4 (Week 5):** OINP, PNP, TR-to-PR — provincial nomination specifics");
  lines.push("**Phase 5 (Week 6):** BOWP, Visitor Record, CAIPS Notes — niche services last");
  lines.push("");

  return lines.join("\n");
}

const report = analyzeCanada();
fs.mkdirSync(REPORTS, { recursive: true });
const jsonPath = path.join(REPORTS, "canada-service-library-inventory.json");
const mdPath = path.join(REPORTS, "canada-service-library-inventory.md");
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(mdPath, formatMarkdown(report));
console.log(`Wrote ${mdPath}`);
console.log(`Wrote ${jsonPath}`);
console.log(`Canada services: ${report.summary.totalCanadaServices}`);
console.log(`Production ready: ${report.summary.productionReady}`);
console.log(`Minor updates: ${report.summary.minorUpdates}`);
console.log(`Major updates: ${report.summary.majorUpdates}`);
console.log(`Complete rebuild: ${report.summary.completeRebuild}`);
