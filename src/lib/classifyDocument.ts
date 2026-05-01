import { supabase } from "@/integrations/supabase/client";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { extractFirstPageText, renderPdfPagesToJpegDataUrls } from "@/lib/extractFirstPageText";

export interface Classification {
  type: string;       // one of DOCUMENT_TYPES, or "Other"
  customType?: string; // when type === "Other"
  confidence: number; // 0..1
  source: "filename" | "ai" | "fallback";
  ownerName?: string | null;
  ownerConfidence?: number;
  ownerEvidence?: string | null;
  ownerSource?: "document_text" | "document_image" | null;
}

const HEURISTICS: { type: string; rx: RegExp; conf: number }[] = [
  { type: "Passport", rx: /passport|^pp[_\s-]?\d|_pp_/i, conf: 0.95 },
  { type: "Birth Certificate", rx: /birth[_\s-]?cert|\bbc\b|nativity/i, conf: 0.92 },
  { type: "IELTS / Language Test", rx: /ielts|toefl|pte|duolingo|trf|language[_\s-]?test/i, conf: 0.95 },
  { type: "Academic Transcripts", rx: /transcript|marksheet|mark[_\s-]?sheet|gradesheet|degree|diploma|consolidated/i, conf: 0.9 },
  { type: "Offer Letter", rx: /offer|loa|letter[_\s-]?of[_\s-]?accept|admission/i, conf: 0.92 },
  { type: "GIC Certificate", rx: /\bgic\b|guaranteed[_\s-]?investment/i, conf: 0.95 },
  { type: "Tuition Fee Receipt", rx: /tuition|fee[_\s-]?receipt|fees[_\s-]?paid/i, conf: 0.92 },
  { type: "Financial Documents", rx: /bank[_\s-]?statement|statement[_\s-]?of[_\s-]?account|salary|payslip|itr|income[_\s-]?tax|fixed[_\s-]?deposit|\bfd\b/i, conf: 0.88 },
  { type: "Medical Report", rx: /medical|imm1017|emed|panel[_\s-]?phys/i, conf: 0.92 },
  { type: "SOP", rx: /\bsop\b|statement[_\s-]?of[_\s-]?purpose|personal[_\s-]?statement/i, conf: 0.95 },
  { type: "Resume", rx: /resume|\bcv\b|curriculum/i, conf: 0.9 },
  { type: "Visa Forms", rx: /imm\d{4}|visa[_\s-]?form|application[_\s-]?form/i, conf: 0.88 },
  { type: "Photograph", rx: /^photo|passport[_\s-]?photo|headshot|\.jpe?g$/i, conf: 0.6 },
];

const CONTENT_HEURISTICS: { type: string; rx: RegExp; conf: number; suggested?: string }[] = [
  { type: "Passport", rx: /passport|republic of|nationality|surname|given names?|passport no|date of expiry|place of birth|[A-Z0-9<]{25,}/i, conf: 0.94 },
  { type: "IELTS / Language Test", rx: /ielts|international english language testing system|test report form|candidate number|overall band|listening\s+reading\s+writing\s+speaking|toefl|pte|duolingo/i, conf: 0.94 },
  { type: "Academic Transcripts", rx: /transcript|marksheet|mark sheet|statement of marks|consolidated|semester|university|college|degree|diploma|provisional certificate|grade point|cgpa|gpa/i, conf: 0.9 },
  { type: "Offer Letter", rx: /offer letter|letter of acceptance|admission|accepted to|program of study|student id/i, conf: 0.9 },
  { type: "GIC Certificate", rx: /guaranteed investment certificate|\bgic\b|investment account|blocked account/i, conf: 0.94 },
  { type: "Tuition Fee Receipt", rx: /tuition|fee receipt|payment receipt|fees paid|student account payment/i, conf: 0.9 },
  { type: "Financial Documents", rx: /bank statement|statement of account|account number|account balance|closing balance|available balance|income tax|\bitr\b|fixed deposit|\bfd\b/i, conf: 0.88 },
  { type: "Visa Forms", rx: /imm\s?\d{4}|application for|visa application|family information|temporary resident|study permit/i, conf: 0.88 },
  { type: "SOP", rx: /statement of purpose|personal statement|\bsop\b/i, conf: 0.92 },
  { type: "Resume", rx: /resume|curriculum vitae|\bcv\b|work experience|professional experience|education qualifications/i, conf: 0.88 },
  { type: "Medical Report", rx: /medical report|emedical|imm\s?1017|panel physician|upfront medical/i, conf: 0.9 },
  { type: "Birth Certificate", rx: /birth certificate|date of birth|place of birth|registration of birth/i, conf: 0.9 },
  { type: "Marriage Certificate", rx: /marriage certificate|certificate of marriage/i, conf: 0.9 },
  { type: "Police Clearance", rx: /police clearance|police certificate|\bpcc\b|criminal record/i, conf: 0.9 },
  { type: "Employment Letter", rx: /employment letter|experience letter|salary slip|pay slip|no objection certificate|\bnoc\b/i, conf: 0.88 },
  { type: "Affidavit of Support", rx: /affidavit of support|sponsorship|sponsor declaration|financial support/i, conf: 0.88 },
];

function pickAllowedType(preferred: string, allowed: string[]): string | null {
  if (allowed.includes(preferred)) return preferred;
  const aliases: Record<string, string[]> = {
    "IELTS / Language Test": ["English Language Proficiency Test", "IELTS", "TOEFL", "PTE", "Duolingo"],
    "Academic Transcripts": ["Academic Marksheets", "Marksheets", "Degree Certificate", "Diploma", "Provisional Certificate"],
    "Resume": ["Updated Resume", "CV"],
    "Financial Documents": ["Bank Statement", "Bank Statements"],
    "Visa Forms": ["Visa Form", "IMM Forms"],
    "Police Clearance": ["Police Clearance Certificate", "PCC"],
    "Employment Letter": ["Experience Letter"],
  };
  return aliases[preferred]?.find((t) => allowed.includes(t)) ?? null;
}

export function classifyByText(text: string, candidateTypes?: string[]): Classification | null {
  const allowed = Array.from(new Set([...DOCUMENT_TYPES, ...(candidateTypes ?? [])].map(String).filter(Boolean)));
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length < 20) return null;
  for (const h of CONTENT_HEURISTICS) {
    if (!h.rx.test(cleaned)) continue;
    const type = pickAllowedType(h.type, allowed);
    if (type) return { type, confidence: h.conf, source: "fallback" };
    return { type: "Other", customType: h.suggested ?? h.type, confidence: 0.65, source: "fallback" };
  }
  return null;
}

export function classifyByFilename(name: string): Classification | null {
  for (const h of HEURISTICS) {
    if (h.rx.test(name)) return { type: h.type, confidence: h.conf, source: "filename" };
  }
  return null;
}

async function imageFileToJpegDataUrl(file: File, maxSide = 1800, quality = 0.82): Promise<string> {
  try {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image_load_failed"));
    });
    img.src = url;
    await loaded;
    URL.revokeObjectURL(url);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return "";
  }
}

export async function classifyDocument(
  file: File,
  candidateTypes?: string[],
  peopleNames?: string[],
): Promise<Classification> {
  // Filename is only a type hint. Candidate ownership must come from document content.
  const fn = classifyByFilename(file.name);

  try {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");
    let snippet = "";
    let pageImages: string[] = [];
    if (isPdf) {
      // Read more than the first page so multi-page single documents (transcripts,
      // bank statements, IELTS reports) are not misfiled as Other when page 1 is sparse.
      snippet = await extractFirstPageText(file, 8000, 8);
      pageImages = await renderPdfPagesToJpegDataUrls(file, 3, 150, 0.78);
    } else if (isImage) {
      const img = await imageFileToJpegDataUrl(file);
      pageImages = img ? [img] : [];
    }

    const allowed = Array.from(new Set([...DOCUMENT_TYPES, ...(candidateTypes ?? [])]));
    const textGuess = classifyByText(snippet, allowed);
    const { data, error } = await supabase.functions.invoke("classify-document", {
      body: {
        filename: file.name,
        snippet,
        is_image: isImage,
        page_image_data_url: pageImages[0] ?? "",
        page_image_data_urls: pageImages,
        size_bytes: file.size,
        allowed_types: allowed,
        case_people: (peopleNames ?? []).filter((n) => n && n.trim()).slice(0, 10),
        filename_type_hint: fn?.type ?? null,
      },
    });
    if (error) throw error;
    const aiType = typeof data?.type === "string" && allowed.includes(data.type) ? data.type : "Other";
    const aiConfidence = typeof data?.confidence === "number" ? Math.min(1, Math.max(0, data.confidence)) : 0.4;
    // If AI cannot read a scanned/low-signal file, keep a strong filename type hint.
    // Ownership is still NEVER taken from the filename; only document type falls back.
    const useTextType = !!textGuess && (aiType === "Other" || aiConfidence < 0.55);
    const useFilenameType = !useTextType && !!fn && (aiType === "Other" || aiConfidence < 0.5);
    const type = useTextType ? textGuess.type : useFilenameType ? fn.type : aiType;
    const confidence = useTextType ? Math.max(textGuess.confidence, aiConfidence) : useFilenameType ? Math.max(fn.confidence, aiConfidence) : aiConfidence;
    return {
      type,
      customType: type === "Other" ? (textGuess?.customType ?? data?.suggested_label as string | undefined) : undefined,
      confidence,
      source: useTextType ? "fallback" : useFilenameType ? "filename" : "ai",
      ownerName: (data?.owner_name as string | null) ?? null,
      ownerConfidence: typeof data?.owner_confidence === "number" ? data.owner_confidence : 0,
      ownerEvidence: (data?.owner_evidence as string | null) ?? null,
      ownerSource: data?.owner_source === "document_text" || data?.owner_source === "document_image" ? data.owner_source : null,
    };
  } catch {
    return fn ?? { type: "Other", confidence: 0.1, source: "fallback" };
  }
}

// ---- Name matching helpers --------------------------------------------------

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return normalizeName(s).split(" ").filter((t) => t.length >= 2);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array(b.length + 1).fill(0).map((_, i) => i);
  const v1 = new Array(b.length + 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
}

export interface NameMatchResult {
  match: boolean;
  score: number;       // 0..1 (1 = perfect)
  reason: string;
}

/**
 * Compare a name extracted from a document with the expected client name.
 * Returns match=true if names look like the same person.
 */
export function matchPersonName(detected: string | null | undefined, expected: string): NameMatchResult {
  if (!detected || !detected.trim()) {
    return { match: true, score: 0, reason: "no_name_detected" }; // don't block when we couldn't read a name
  }
  const a = normalizeName(detected);
  const b = normalizeName(expected);
  if (!a || !b) return { match: true, score: 0, reason: "empty_after_normalize" };
  if (a === b) return { match: true, score: 1, reason: "exact" };

  const aTok = new Set(tokens(detected));
  const bTok = new Set(tokens(expected));
  if (aTok.size === 0 || bTok.size === 0) return { match: true, score: 0, reason: "no_tokens" };

  // Token overlap (Jaccard)
  let intersect = 0;
  for (const t of aTok) if (bTok.has(t)) intersect++;
  const jaccard = intersect / new Set([...aTok, ...bTok]).size;

  // Levenshtein ratio on full normalized name
  const lev = levenshtein(a, b);
  const ratio = 1 - lev / Math.max(a.length, b.length);

  // First+last token match
  const aArr = [...aTok];
  const bArr = [...bTok];
  const firstLastMatch =
    (aArr[0] === bArr[0] && aArr[aArr.length - 1] === bArr[bArr.length - 1]);

  const score = Math.max(jaccard, ratio, firstLastMatch ? 0.9 : 0);
  const match = jaccard >= 0.6 || ratio >= 0.85 || firstLastMatch;
  return { match, score, reason: `jaccard=${jaccard.toFixed(2)} lev=${ratio.toFixed(2)} fl=${firstLastMatch}` };
}