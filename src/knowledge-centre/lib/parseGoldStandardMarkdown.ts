/**
 * Parses Knowledge Writing Standard v1.0 Gold Standard markdown guides
 * into GuideImportPayload (importer contract).
 */
import { DEFAULT_GUIDE_SECTIONS } from "./guideSections";
import type { GuideImportPayload } from "./guideImport";
import type { StructuredSectionBlock } from "@/knowledge-centre/types/kc";

const SECTION_IDS = [
  "overview",
  "eligibility",
  "cost-planning",
  "family-guide",
  "future-link-services",
  "counselling-journey",
  "future-applications",
  "settlement-guide",
  "common-mistakes",
] as const;

const SECTION_TITLE_TO_ID: Record<string, string> = {
  overview: "overview",
  "eligibility summary": "eligibility",
  "cost planning": "cost-planning",
  "family guide": "family-guide",
  "future link services": "future-link-services",
  "complete counselling journey": "counselling-journey",
  "future applications": "future-applications",
  "settlement guide": "settlement-guide",
  "common mistakes": "common-mistakes",
};

const RELATED_SLUG_MAP: Record<string, string> = {
  "proof of funds": "kc-proof-of-funds",
  "working rights": "kc-working-rights",
  "medical examination": "kc-medical-examination",
  biometrics: "kc-biometrics",
  healthcare: "kc-healthcare-canada",
  accommodation: "kc-accommodation",
  banking: "kc-banking-newcomers",
  transportation: "kc-transportation",
  settlement: "kc-settlement",
  "family rights": "kc-family-rights",
  "pal/tal": "kc-pal-tal",
  pgwp: "kc-pgwp-canada",
};

const OFFICIAL_URL_BY_PAGE: Record<string, string> = {
  "study permit": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html",
  "pal/tal": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents.html",
  "proof of funds": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents/financial-support.html",
  "dli list": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html",
  "pay your fees": "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigration-citizenship-application-fees.html",
  "check processing times": "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-status.html",
  "apply (gckey)": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/apply.html",
  "guide 5269": "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5269-application-study-permit-outside-canada.html",
  "medical exams": "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/medical-police/medical-exams.html",
  biometrics: "https://www.canada.ca/en/immigration-refugees-citizenship/campaigns/biometrics/facts.html",
  "work off campus": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work.html",
  sin: "https://www.canada.ca/en/employment-social-development/services/social-insurance-number.html",
  "provincial coverage": "https://www.canada.ca/en/health-canada/services/health-care-system.html",
  "newcomers & taxes": "https://www.canada.ca/en/services/taxes/international-non-residents/individuals/leaving-entering-canada-non-residents/newcomers.html",
  pgwp: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation.html",
};

const DOWNLOAD_TYPE_MAP: Record<string, { type: string; subtype?: string }> = {
  "counsellor guide": { type: "counsellor_guide" },
  "meeting checklist": { type: "meeting_checklist" },
  "budget planner": { type: "budget_planner" },
  "arrival checklist": { type: "arrival_checklist" },
  "settlement planner": { type: "settlement_checklist" },
  "packing checklist": { type: "other", subtype: "packing_list" },
};

function extractCounsellingObjective(block: string): string | undefined {
  const m = block.match(/\*\*Counselling objective\*\*\s*→\s*\*([^*]+)\*/i);
  return m?.[1]?.trim();
}

function extractContentClassification(block: string): string[] {
  const m = block.match(/\*\*Content classification:\*\*\s*(.+)/i);
  if (!m) return [];
  const raw = m[1].toLowerCase();
  const out: string[] = [];
  if (raw.includes("future link")) out.push("future_link");
  if (raw.includes("official reference") || raw.includes("official")) out.push("official_reference");
  if (raw.includes("download")) out.push("download");
  if (raw.includes("related knowledge")) out.push("related_knowledge");
  return out;
}

function extractPurpose(block: string): string | undefined {
  const m = block.match(/\*\*Purpose\*\*\s*—\s*(.+)/i);
  return m?.[1]?.trim();
}

function parseMarkdownTable(block: string): { headers: string[]; rows: string[][] } | null {
  const lines = block.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 2) return null;
  const parseRow = (line: string) =>
    line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow).filter((r) => r.length === headers.length);
  return { headers, rows };
}

function splitSections(markdown: string): Map<string, string> {
  const parts = markdown.split(/^## \d+ · /m).slice(1);
  const map = new Map<string, string>();
  for (const part of parts) {
    const titleLine = part.split("\n")[0] ?? "";
    const titleKey = titleLine.replace(/\s*🟦.*/, "").replace(/\s*\(.*/, "").trim().toLowerCase();
    const id = SECTION_TITLE_TO_ID[titleKey] ?? titleKey.replace(/\s+/g, "-");
    if (titleLine.match(/faqs/i)) map.set("faqs", part);
    else if (titleLine.match(/quiz/i)) map.set("quiz", part);
    else if (titleLine.match(/downloads/i)) map.set("downloads", part);
    else if (titleLine.match(/official resources/i)) map.set("official-resources", part);
    else if (titleLine.match(/related knowledge/i)) map.set("related-knowledge", part);
    else if (SECTION_IDS.includes(id as typeof SECTION_IDS[number])) map.set(id, part);
  }
  return map;
}

function parseNarrativeSections(sectionMap: Map<string, string>): StructuredSectionBlock[] {
  const blocks: StructuredSectionBlock[] = [];
  for (const id of SECTION_IDS) {
    const raw = sectionMap.get(id);
    if (!raw) continue;
    const manifest = DEFAULT_GUIDE_SECTIONS.find((s) => s.id === id);
    const table = parseMarkdownTable(raw);
    const lists = raw
      .split("\n")
      .filter((l) => /^\d+\.\s/.test(l.trim()) || /^-\s/.test(l.trim()))
      .map((l) => l.trim());
    const bodyParts = raw
      .split("\n")
      .filter((l) => {
        const t = l.trim();
        return t && !t.startsWith("|") && !t.startsWith("**Counselling") && !t.startsWith("**Content classification");
      })
      .slice(0, 12)
      .join("\n");

    blocks.push({
      id,
      title: manifest?.title ?? id,
      purpose: extractPurpose(raw),
      counselling_objective: extractCounsellingObjective(raw),
      content_classification: extractContentClassification(raw),
      body_md: bodyParts.slice(0, 4000),
      tables: table ? [table] : undefined,
      lists: lists.length ? lists : undefined,
    });
  }
  return blocks;
}

function parseFaqs(block: string | undefined) {
  if (!block) return [];
  const table = parseMarkdownTable(block);
  if (!table) return [];
  return table.rows.map((row, i) => ({
    sort_order: Number(row[0]) || i + 1,
    question: row[1] ?? "",
    answer: row[2] ?? "",
  }));
}

function parseQuiz(block: string | undefined) {
  if (!block) return [];
  const questions: GuideImportPayload["quiz"] = [];
  let level = 1;
  const lines = block.split("\n");
  for (const line of lines) {
    if (/^beginner/i.test(line.trim())) level = 1;
    if (/^intermediate/i.test(line.trim())) level = 2;
    if (/^advanced/i.test(line.trim())) level = 3;
    const m = line.match(/^\d+\.\s+(.+)/);
    if (m) {
      questions.push({
        question: m[1].trim(),
        options: [
          "Apply Future Link counselling framework",
          "Quote figures without checking official source",
          "Defer to client to self-research",
        ],
        correct_index: 0,
        explanation: "Training Library answer key — discuss with documentation lead.",
        level,
        sort_order: questions.length + 1,
      });
    }
  }
  return questions ?? [];
}

function parseDownloads(block: string | undefined, slug: string) {
  if (!block) return [];
  const table = parseMarkdownTable(block);
  if (!table) return [];
  return table.rows.map((row, i) => {
    const template = (row[0] ?? "").toLowerCase();
    const journey = row[2] ?? "";
    const mapped = DOWNLOAD_TYPE_MAP[template] ?? { type: "other" };
    const fileSlug = template.replace(/\s+/g, "-");
    return {
      title: row[0] ?? `Download ${i + 1}`,
      download_type: mapped.type as GuideImportPayload["downloads"][0]["download_type"],
      storage_path: `${slug}/templates/${fileSlug}.pdf`,
      journey_stage: journey,
      subtype: mapped.subtype,
      sort_order: i + 1,
    };
  });
}

function parseOfficialSources(block: string | undefined) {
  if (!block) return [];
  const table = parseMarkdownTable(block);
  if (!table) return [];
  return table.rows.map((row) => {
    const page = (row[2] ?? "").toLowerCase();
    const pageLabel = row[2] ?? "";
    const authority = row[1] ?? "";
    const isArticle = authority.includes("(Article)") || pageLabel.includes("Knowledge Article");
    const urlKey = Object.keys(OFFICIAL_URL_BY_PAGE).find((k) => page.includes(k)) ?? page;
    const url = OFFICIAL_URL_BY_PAGE[urlKey] ?? "https://www.canada.ca/en/immigration-refugees-citizenship.html";
    return {
      category: row[0] ?? "general",
      authority: authority.replace("(Article)", "").trim() || "IRCC",
      title: pageLabel || authority,
      official_url: url,
      country_code: "CA",
      reason: row[4] ?? "",
      skip_registry: isArticle,
      article_slug:
        pageLabel.toLowerCase().includes("banking")
          ? "kc-banking-newcomers"
          : pageLabel.toLowerCase().includes("transport")
            ? "kc-transportation"
            : undefined,
    };
  });
}

function parseRelatedSlugs(block: string | undefined): string[] {
  if (!block) return [];
  const slugs: string[] = [];
  const lower = block.toLowerCase();
  for (const [label, slug] of Object.entries(RELATED_SLUG_MAP)) {
    if (lower.includes(label)) slugs.push(slug);
  }
  return slugs;
}

export function parseGoldStandardMarkdown(markdown: string, opts?: {
  slug?: string;
  serviceLibraryId?: string;
}): GuideImportPayload {
  const titleMatch = markdown.match(/^# (.+)/m);
  const title = titleMatch?.[1]?.trim() ?? "Knowledge Guide";
  const slug = opts?.slug ?? "canada-student-visa-outside-canada";
  const sectionMap = splitSections(markdown);

  const officialRows = parseOfficialSources(sectionMap.get("official-resources"));
  const registrySources = officialRows.filter((s) => !s.skip_registry).map(({ skip_registry: _, article_slug: __, ...rest }) => rest);

  const relatedFromOfficial = officialRows
    .filter((s) => s.article_slug)
    .map((s) => s.article_slug!);

  const relatedSlugs = [...new Set([...parseRelatedSlugs(sectionMap.get("related-knowledge")), ...relatedFromOfficial])];

  return {
    slug,
    title,
    article_kind: "service",
    version_label: "1.0.0",
    country_codes: ["CA"],
    service_library_ids: opts?.serviceLibraryId ? [opts.serviceLibraryId] : [],
    tags: ["canada", "student", "visa", "study-permit", "outside-canada"],
    categories: ["visa", "counselling", "student"],
    estimated_reading_minutes: 45,
    external_module_refs: [
      { module: "institutions", route: "/institutions", label: "Institution Master" },
      { module: "fee_master", route: "/masters", label: "Fee Master" },
      { module: "documents", route: "/forms-library", label: "Document Library" },
    ],
    guide_sections: DEFAULT_GUIDE_SECTIONS,
    narrative_sections: parseNarrativeSections(sectionMap),
    faqs: parseFaqs(sectionMap.get("faqs")),
    quiz: parseQuiz(sectionMap.get("quiz")),
    downloads: parseDownloads(sectionMap.get("downloads"), slug),
    official_sources: registrySources,
    official_sources: registrySources,
    related_article_slugs: relatedSlugs,
    shared_articles: Object.entries(RELATED_SLUG_MAP).map(([label, sharedSlug]) => ({
      slug: sharedSlug,
      title: label.charAt(0).toUpperCase() + label.slice(1),
      article_kind: "shared" as const,
      country_codes: ["CA"],
      narrative_sections: [
        {
          id: "overview",
          title: label.charAt(0).toUpperCase() + label.slice(1),
          purpose: `Deep-dive shared article for ${label}.`,
          body_md: `Refer to official sources. Do not duplicate counselling content from the master service guide.`,
          counselling_objective: `Counsellor can explain ${label} using authoritative links.`,
          content_classification: ["official_reference", "related_knowledge"],
        },
      ],
    })),
  };
}
