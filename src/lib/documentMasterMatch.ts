import type { MasterItem } from "@/lib/masters";
import { buildClassifiedDocumentName } from "@/lib/constants";

export interface DocumentMasterMatchInput {
  masterItems: readonly MasterItem[];
  filename: string;
  snippet?: string;
  coarseType?: string | null;
  coarseCustomType?: string | null;
  aiSuggestedLabel?: string | null;
  aiType?: string | null;
}

export interface DocumentMasterMatchResult {
  /** Exact Document Master label chosen for display + rename. */
  label: string;
  confidence: number;
  /** Value for client_documents.document_type */
  documentType: string;
  /** Value for client_documents.custom_type (display) */
  customType: string;
  /** Same as label — used for buildClassifiedDocumentName */
  displayLabel: string;
}

const GENERIC_LABELS = new Set(
  [
    "academic transcripts",
    "academic transcript",
    "financial documents",
    "english language proficiency test",
    "visa forms",
    "other",
  ].map(normalizeKey),
);

type SpecificHint = {
  pattern: RegExp;
  matchesLabel: (labelNorm: string) => boolean;
  boost: number;
};

/** Keyword patterns that boost specific Document Master labels over generic buckets. */
const SPECIFIC_HINTS: SpecificHint[] = [
  {
    pattern: /consolidated\s+mark\s*sheet|consolidated\s+marksheet/i,
    matchesLabel: (l) => l.includes("consolidated") && l.includes("marksheet"),
    boost: 0.55,
  },
  {
    pattern: /migration\s+certificate/i,
    matchesLabel: (l) => l.includes("migration"),
    boost: 0.55,
  },
  {
    pattern: /provisional\s+certificate/i,
    matchesLabel: (l) => l.includes("provisional"),
    boost: 0.5,
  },
  {
    pattern: /degree\s+certificate/i,
    matchesLabel: (l) => l.includes("degree") && l.includes("cert"),
    boost: 0.5,
  },
  {
    pattern: /diploma\s+certificate|\bdiploma\b/i,
    matchesLabel: (l) => l.includes("diploma"),
    boost: 0.45,
  },
  {
    pattern: /mark\s*sheet|marksheet|statement\s+of\s+marks/i,
    matchesLabel: (l) => l.includes("marksheet") && !l.includes("consolidated"),
    boost: 0.48,
  },
  {
    pattern: /academic\s+transcript|\btranscript\b/i,
    matchesLabel: (l) => l.includes("transcript") && !l.includes("migration"),
    boost: 0.42,
  },
  {
    pattern: /\bielts\b|test\s+report\s+form|\btrf\b/i,
    matchesLabel: (l) => l.includes("ielts"),
    boost: 0.5,
  },
  {
    pattern: /\bpte\b|pearson\s+test\s+of\s+english|pte\s+score/i,
    matchesLabel: (l) => l.includes("pte"),
    boost: 0.5,
  },
  {
    pattern: /\btoefl\b/i,
    matchesLabel: (l) => l.includes("toefl"),
    boost: 0.45,
  },
  {
    pattern: /\bcelpip\b/i,
    matchesLabel: (l) => l.includes("celpip"),
    boost: 0.45,
  },
  {
    pattern: /\bduolingo\b|\bdet\s+score/i,
    matchesLabel: (l) => l.includes("duolingo"),
    boost: 0.45,
  },
];

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isGenericLabel(labelNorm: string): boolean {
  return GENERIC_LABELS.has(labelNorm);
}

function readAliases(item: MasterItem): string[] {
  const raw = item.metadata?.aliases;
  if (!Array.isArray(raw)) return [];
  return raw.map((a) => String(a)).filter(Boolean);
}

function scoreMasterItem(
  item: MasterItem,
  blobNorm: string,
  filenameNorm: string,
  snippetNorm: string,
): number {
  const labelNorm = normalizeKey(item.label);
  if (!labelNorm || labelNorm === "other") return 0;

  let score = 0;

  if (filenameNorm.includes(labelNorm)) score += 0.58;
  if (snippetNorm.includes(labelNorm)) score += 0.52;
  if (blobNorm.includes(labelNorm)) score += 0.38;

  const tokens = labelNorm.split(" ").filter((t) => t.length > 2);
  if (tokens.length > 0) {
    const matched = tokens.filter((t) => blobNorm.includes(t)).length;
    score += (matched / tokens.length) * 0.32;
  }

  for (const alias of readAliases(item)) {
    const an = normalizeKey(alias);
    if (!an) continue;
    if (filenameNorm.includes(an) || snippetNorm.includes(an) || blobNorm.includes(an)) {
      score += 0.58;
      break;
    }
  }

  const searchText = `${filenameNorm} ${snippetNorm} ${blobNorm}`;
  for (const hint of SPECIFIC_HINTS) {
    if (hint.pattern.test(searchText) && hint.matchesLabel(labelNorm)) {
      score += hint.boost;
    }
  }

  if (isGenericLabel(labelNorm)) score -= 0.22;

  if (score > 0.15) {
    score += Math.min(tokens.length * 0.035, 0.14);
  }

  return Math.max(0, Math.min(1, score));
}

function findInMaster(labels: string[], candidate: string | null | undefined): string | null {
  if (!candidate?.trim()) return null;
  const c = candidate.trim();
  if (labels.includes(c)) return c;
  const cn = normalizeKey(c);
  return labels.find((l) => normalizeKey(l) === cn) ?? null;
}

function looseMasterMatch(labels: string[], candidate: string | null | undefined): string | null {
  const exact = findInMaster(labels, candidate);
  if (exact) return exact;
  if (!candidate?.trim()) return null;
  const cn = normalizeKey(candidate);
  for (const label of labels) {
    const ln = normalizeKey(label);
    if (ln.includes(cn) || cn.includes(ln)) return label;
  }
  return null;
}

const MIN_MATCH_SCORE = 0.34;

/**
 * Resolve the best Document Master label from identification signals.
 * Prefers the most specific active master item; generic labels are fallback only.
 */
export function resolveDocumentMasterLabel(
  input: DocumentMasterMatchInput,
): DocumentMasterMatchResult {
  const items = input.masterItems.filter((i) => i.label && i.label !== "Other");
  const labels = items.map((i) => i.label);

  const blobNorm = normalizeKey(
    [input.filename, input.snippet, input.coarseCustomType, input.aiSuggestedLabel, input.aiType]
      .filter(Boolean)
      .join(" "),
  );
  const filenameNorm = normalizeKey(input.filename);
  const snippetNorm = normalizeKey(input.snippet ?? "");

  let best: { label: string; score: number } | null = null;
  for (const item of items) {
    const score = scoreMasterItem(item, blobNorm, filenameNorm, snippetNorm);
    if (
      score > 0 &&
      (!best ||
        score > best.score ||
        (Math.abs(score - best.score) < 0.001 && item.label.length > best.label.length))
    ) {
      best = { label: item.label, score };
    }
  }

  let label: string;
  let confidence: number;

  if (best && best.score >= MIN_MATCH_SCORE) {
    label = best.label;
    confidence = best.score;
  } else {
    const candidates = [
      input.aiSuggestedLabel,
      input.coarseCustomType,
      input.aiType,
      input.coarseType,
    ];
    let fallback: string | null = null;
    for (const c of candidates) {
      fallback = looseMasterMatch(labels, c);
      if (fallback) break;
    }
    if (!fallback && input.coarseType) {
      fallback = looseMasterMatch(labels, input.coarseType);
    }
    label = fallback ?? input.coarseCustomType?.trim() ?? input.coarseType?.trim() ?? "Other";
    confidence = fallback ? 0.28 : 0.15;
  }

  const inMaster = labels.includes(label);
  if (inMaster) {
    return {
      label,
      confidence,
      documentType: label,
      customType: label,
      displayLabel: label,
    };
  }

  const displayLabel = label === "Other" ? input.coarseCustomType?.trim() || "Other" : label;
  return {
    label: displayLabel,
    confidence,
    documentType: "Other",
    customType: displayLabel,
    displayLabel,
  };
}

/** Build stored PDF filename from Document Master display label. */
export function masterDocumentFileName(
  displayLabel: string,
  originalFileName: string,
  version: number,
): string {
  return buildClassifiedDocumentName(displayLabel, originalFileName, version);
}
