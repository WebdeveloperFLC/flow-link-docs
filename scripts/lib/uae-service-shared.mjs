/** Shared helpers for UAE service library content. */

export const UAE_COUNTRY = "United Arab Emirates";
export const UAE_IDS = {
  "uae-student-visa.json": "b2000001-0001-4000-8000-0000000000cf",
  "uae-spouse-dependent-visa.json": "b2000001-0001-4000-8000-0000000000d8",
  "uae-visitor-visa.json": "b2000001-0001-4000-8000-0000000000d9",
  "uae-work-permit.json": "b2000001-0001-4000-8000-0000000000da",
  "uae-golden-visa.json": "b2000001-0001-4000-8000-0000000000db",
};

export function costBreakdown(title, sections, totals, sourceUrl, disclaimer) {
  return {
    title,
    currency: "AED",
    lastVerified: "Jun 2026",
    disclaimer: disclaimer ?? "Indicative costs for counselor discussions only. Verify on ICP/GDRFA/MOHRE portals before quoting.",
    sourceUrl,
    sections,
    totals: totals ?? [],
  };
}

export function baseMeta(displayName, shortDescription, learningMinutes = 18) {
  return {
    displayName,
    shortDescription,
    version: "v1.0",
    versionStatus: "Live",
    reviewStatus: "active",
    updatedLabel: "Updated 10 Jun 2026",
    learningLevel: "Intermediate",
    learningMinutes,
    compliance: [
      "Client service agreement and consent must be on file before submission",
      "Never guarantee visa or immigration approval; use approved-language only",
      "Fee quotes must separate consultancy, government, and third-party costs",
      "Verify licensed institution or employer before collecting full fees",
    ],
    performance: { ourRate: 88, industryRate: 72, stats: [{ label: "Files this year", value: "0" }, { label: "Approved", value: "0" }] },
    approvalFactors: [
      { label: "Complete sponsorship file", ours: 90, benchmark: 75 },
      { label: "Credible funds / salary proof", ours: 85, benchmark: 70 },
      { label: "Clean immigration history", ours: 88, benchmark: 72 },
    ],
    changelog: [{ version: "v1.0", date: "10 Jun 2026", author: "Service Library", summary: "Initial UAE counselor content — India application route." }],
  };
}

export function miscFlcConsultancy(range = "See Fees tab") {
  return [{ label: "Future Link consultancy fee", range, notes: "Service package dependent — GST extra where applicable" }];
}
