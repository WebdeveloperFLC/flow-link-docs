/**
 * Service Library completeness audit — shared checks for scripts and tests.
 */

export const THRESHOLDS = {
  faqs: 30,
  quiz: 75,
  quizMin: 15,
  redFlags: 5,
  kpis: 3,
  resources: 4,
  proTips: 5,
  timeline: 4,
  submissionChecklist: 10,
  fullCostSections: 4,
  sampleDocs: 1,
};

function len(arr) {
  return Array.isArray(arr) ? arr.length : 0;
}

function isEmptyStr(v) {
  return v == null || (typeof v === "string" && v.trim() === "");
}

function hasProcessFlow(processFlow) {
  return Array.isArray(processFlow) && processFlow.some((s) => typeof s === "string" && s.trim());
}

function hasTimeline(meta, processFlow) {
  return len(meta.timeline) >= THRESHOLDS.timeline || hasProcessFlow(processFlow);
}

function hasFees(meta, feeItemCount) {
  const hasMetaFees =
    len(meta.feeBreakdown?.items) > 0 ||
    len(meta.consultancyBreakdown?.packages) > 0 ||
    (meta.kpis ?? []).some((k) => /government fee|consultancy fee/i.test(k.label ?? ""));
  return hasMetaFees || feeItemCount > 0;
}

function missingVerificationDates(meta) {
  const missing = [];
  if (!meta.feeBreakdown?.lastVerified && len(meta.feeBreakdown?.items) > 0) {
    missing.push("feeBreakdown.lastVerified");
  }
  if (!meta.consultancyBreakdown?.lastVerified && len(meta.consultancyBreakdown?.packages) > 0) {
    missing.push("consultancyBreakdown.lastVerified");
  }
  if (!meta.fullCostBreakdown?.lastVerified && len(meta.fullCostBreakdown?.sections) > 0) {
    missing.push("fullCostBreakdown.lastVerified");
  }
  if (meta.workingRights?.applicant?.summary && !meta.workingRights.applicant.lastVerified) {
    missing.push("workingRights.applicant.lastVerified");
  }
  if (meta.workingRights?.spouse?.summary && !meta.workingRights.spouse.lastVerified) {
    missing.push("workingRights.spouse.lastVerified");
  }
  if (meta.policyAlert?.active && !meta.policyAlert?.date) {
    missing.push("policyAlert.date");
  }
  if (!meta.updatedLabel) {
    missing.push("updatedLabel");
  }
  return missing;
}

function emptyMetadataSections(meta, category) {
  const gaps = [];
  if (isEmptyStr(meta.displayName)) gaps.push("displayName");
  if (isEmptyStr(meta.shortDescription)) gaps.push("shortDescription");
  if (isEmptyStr(meta.version)) gaps.push("version");
  if (len(meta.about) === 0) gaps.push("about");
  if (len(meta.eligibility) === 0) gaps.push("eligibility");
  if (len(meta.redFlags) === 0) gaps.push("redFlags");
  if (isEmptyStr(meta.redFlagsBanner)) gaps.push("redFlagsBanner");
  if (len(meta.faqs) === 0) gaps.push("faqs");
  if (len(meta.compliance) === 0) gaps.push("compliance");
  if (len(meta.proTips) === 0) gaps.push("proTips");
  if (len(meta.postApproval) === 0) gaps.push("postApproval");
  if (len(meta.kpis) < THRESHOLDS.kpis) gaps.push(`kpis (<${THRESHOLDS.kpis})`);
  if (len(meta.resources) === 0) gaps.push("resources");
  if (len(meta.quiz) === 0) gaps.push("quiz");
  if (len(meta.sampleDocs) === 0) gaps.push("sampleDocs");
  if (!meta.donts?.dos?.length && !meta.donts?.donts?.length) gaps.push("donts");
  if (len(meta.timeline) === 0) gaps.push("timeline (metadata)");
  if (len(meta.changelog) === 0) gaps.push("changelog");
  if (category === "visa_immigration") {
    if (!meta.workingRights?.applicant?.summary) gaps.push("workingRights.applicant");
    if (!meta.workingRights?.spouse?.summary) gaps.push("workingRights.spouse");
    if (len(meta.fullCostBreakdown?.sections) < THRESHOLDS.fullCostSections) {
      gaps.push(`fullCostBreakdown.sections (<${THRESHOLDS.fullCostSections})`);
    }
  }
  return gaps;
}

function belowThreshold(meta) {
  const issues = [];
  if (len(meta.faqs) > 0 && len(meta.faqs) < THRESHOLDS.faqs) {
    issues.push(`faqs: ${len(meta.faqs)}/${THRESHOLDS.faqs}`);
  }
  if (len(meta.quiz) > 0 && len(meta.quiz) < THRESHOLDS.quiz) {
    issues.push(`quiz: ${len(meta.quiz)}/${THRESHOLDS.quiz}`);
  }
  if (len(meta.redFlags) > 0 && len(meta.redFlags) < THRESHOLDS.redFlags) {
    issues.push(`redFlags: ${len(meta.redFlags)}/${THRESHOLDS.redFlags}`);
  }
  if (len(meta.proTips) > 0 && len(meta.proTips) < THRESHOLDS.proTips) {
    issues.push(`proTips: ${len(meta.proTips)}/${THRESHOLDS.proTips}`);
  }
  if (len(meta.resources) > 0 && len(meta.resources) < THRESHOLDS.resources) {
    issues.push(`resources: ${len(meta.resources)}/${THRESHOLDS.resources}`);
  }
  return issues;
}

function contentFingerprint(meta) {
  const parts = [
    meta.shortDescription ?? "",
    ...(meta.faqs ?? []).map((f) => f.q?.trim().toLowerCase() ?? ""),
    ...(meta.redFlags ?? []).map((r) => r.title?.trim().toLowerCase() ?? ""),
  ].filter(Boolean);
  return parts.join("|");
}

function faqOverlap(a, b) {
  const qsA = new Set((a.faqs ?? []).map((f) => f.q?.trim().toLowerCase()).filter(Boolean));
  const qsB = (b.faqs ?? []).map((f) => f.q?.trim().toLowerCase()).filter(Boolean);
  if (!qsA.size || !qsB.length) return [];
  return qsB.filter((q) => qsA.has(q));
}

/**
 * Audit one service record.
 * @param {object} row
 * @param {string} row.id
 * @param {string} row.file
 * @param {string} row.service_category
 * @param {string} row.service
 * @param {string} row.sub_service
 * @param {string[]} row.countries
 * @param {object} row.meta - academy_metadata
 * @param {string[]|null} [row.process_flow]
 * @param {string|null} [row.cost_summary_html]
 * @param {number} [row.feeItemCount]
 * @param {number} [row.submissionChecklistCount]
 * @param {number} [row.visaFormCount]
 * @param {number} [row.checklistFileCount]
 * @param {number} [row.overrideCount]
 */
export function auditServiceRow(row) {
  const meta = row.meta ?? {};
  const category = row.service_category ?? "visa_immigration";
  const emptySections = emptyMetadataSections(meta, category);
  const below = belowThreshold(meta);
  const missingDates = missingVerificationDates(meta);

  const dbGaps = [];
  if (!hasProcessFlow(row.process_flow) && len(meta.timeline) < THRESHOLDS.timeline) {
    dbGaps.push("process_flow (DB)");
  }
  if (isEmptyStr(row.cost_summary_html) && len(meta.fullCostBreakdown?.sections) < THRESHOLDS.fullCostSections) {
    dbGaps.push("cost_summary_html (DB)");
  }
  if (!hasFees(meta, row.feeItemCount ?? 0)) dbGaps.push("fees (metadata or service_library_fee_items)");
  if ((row.submissionChecklistCount ?? 0) < THRESHOLDS.submissionChecklist) {
    dbGaps.push(`submission checklist (${row.submissionChecklistCount ?? 0}/${THRESHOLDS.submissionChecklist})`);
  }
  if ((row.visaFormCount ?? 0) === 0 && category === "visa_immigration") {
    dbGaps.push("visa forms");
  }
  if ((row.checklistFileCount ?? 0) === 0 && category === "visa_immigration") {
    dbGaps.push("checklist PDFs");
  }
  if (category === "visa_immigration" && (row.countries ?? []).length === 0) {
    dbGaps.push("country mapping");
  }

  const issueCount =
    emptySections.length +
    below.length +
    missingDates.length +
    dbGaps.length;

  return {
    id: row.id,
    file: row.file,
    displayName: meta.displayName ?? row.sub_service ?? row.file ?? row.id,
    service_category: category,
    service: row.service,
    sub_service: row.sub_service,
    countries: row.countries ?? [],
    emptySections,
    belowThreshold: below,
    missingVerificationDates: missingDates,
    dbGaps,
    metadataGaps: [...emptySections, ...below, ...missingDates],
    overrideCount: row.overrideCount ?? 0,
    counts: {
      faqs: len(meta.faqs),
      quiz: len(meta.quiz),
      redFlags: len(meta.redFlags),
      kpis: len(meta.kpis),
      resources: len(meta.resources),
      sampleDocs: len(meta.sampleDocs),
      timeline: len(meta.timeline),
      processFlow: hasProcessFlow(row.process_flow) ? row.process_flow.length : 0,
      feeItems: row.feeItemCount ?? 0,
      submissionChecklist: row.submissionChecklistCount ?? 0,
      visaForms: row.visaFormCount ?? 0,
      checklistFiles: row.checklistFileCount ?? 0,
    },
    fingerprint: contentFingerprint(meta),
    issueCount,
    metadataIssueCount: emptySections.length + below.length + missingDates.length,
    complete: issueCount === 0,
    metadataComplete: emptySections.length + below.length + missingDates.length === 0,
  };
}

export function findDuplicates(audits) {
  const byFingerprint = new Map();
  const duplicateGroups = [];
  const faqDuplicates = [];

  for (const a of audits) {
    if (!a.fingerprint) continue;
    const key = a.fingerprint.slice(0, 500);
    if (!byFingerprint.has(key)) byFingerprint.set(key, []);
    byFingerprint.get(key).push(a);
  }

  for (const [, group] of byFingerprint) {
    if (group.length > 1) {
      duplicateGroups.push({
        type: "similar_content",
        services: group.map((g) => g.displayName),
        files: group.map((g) => g.file),
        ids: group.map((g) => g.id),
      });
    }
  }

  return { duplicateGroups };
}

export function findFaqDuplicates(auditsWithMeta) {
  const faqMap = new Map();
  const pairs = [];

  for (const { audit, meta } of auditsWithMeta) {
    for (const f of meta.faqs ?? []) {
      const q = f.q?.trim().toLowerCase();
      if (!q) continue;
      if (!faqMap.has(q)) faqMap.set(q, []);
      faqMap.get(q).push(audit.displayName);
    }
  }

  for (const [question, services] of faqMap) {
    const unique = [...new Set(services)];
    if (unique.length > 1) {
      pairs.push({ question, services: unique });
    }
  }

  return pairs.sort((a, b) => b.services.length - a.services.length);
}

export function summarizeAudits(audits) {
  const total = audits.length;
  const complete = audits.filter((a) => a.complete).length;
  const metadataComplete = audits.filter((a) => a.metadataComplete).length;
  const byCategory = {};
  for (const a of audits) {
    byCategory[a.service_category] = (byCategory[a.service_category] ?? 0) + 1;
  }

  const gapCounts = {};
  const addGaps = (arr, prefix) => {
    for (const g of arr) {
      const key = prefix ? `${prefix}:${g}` : g;
      gapCounts[key] = (gapCounts[key] ?? 0) + 1;
    }
  };
  for (const a of audits) {
    addGaps(a.emptySections, "empty");
    addGaps(a.belowThreshold, "below");
    addGaps(a.missingVerificationDates, "dates");
    addGaps(a.dbGaps, "db");
    for (const g of a.metadataGaps) {
      gapCounts[`meta:${g}`] = (gapCounts[`meta:${g}`] ?? 0) + 1;
    }
  }

  return {
    total,
    complete,
    metadataComplete,
    incomplete: total - complete,
    metadataIncomplete: total - metadataComplete,
    byCategory,
    gapCounts: Object.fromEntries(
      Object.entries(gapCounts).sort(([, a], [, b]) => b - a),
    ),
  };
}
