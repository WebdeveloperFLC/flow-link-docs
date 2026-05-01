import { PDFDocument } from "pdf-lib";
import { renderPdfPagesToJpegDataUrls } from "@/lib/extractFirstPageText";
import { DOCUMENT_TYPES as DEFAULT_DOCUMENT_TYPES } from "@/lib/constants";

export interface BinderSegment {
  start_page: number; // 1-based inclusive
  end_page: number;   // 1-based inclusive
  type: string;
  suggested_label?: string | null;
  owner_name?: string | null;
  owner_evidence?: string | null;
  confidence?: number;
  reason?: string | null;
}

export function getAllowedDocumentTypes(extraTypes: string[] = []): string[] {
  return Array.from(new Set([...DEFAULT_DOCUMENT_TYPES, ...extraTypes].map(String).filter(Boolean)));
}

/** Filename-based hint that a multi-page PDF is likely a binder of mixed documents. */
export function looksLikeBinderName(fileName: string): boolean {
  return /\b(binder|combined|merged|bundle|package|compiled|applicant\s+docs?|applicant\s+documents?|all\s+docs|documents?\s+package)\b/i.test(fileName);
}

/**
 * Decide whether the AI splitter result is unreliable and we should split the
 * PDF into page-range segments for manual review instead of uploading it whole.
 *
 * Triggers when ANY of:
 *  - filename looks like a binder
 *  - splitter returned 0 / 1 segments for a multi-page PDF
 *  - the only / dominant segment is "Other" with low confidence
 *  - segments don't cover all pages or are otherwise incomplete
 */
export function shouldFallbackToPageRanges(fileName: string, pageCount: number, segments: BinderSegment[]): boolean {
  if (pageCount < 3) return false;
  const looksLikeBinder = looksLikeBinderName(fileName);

  // No usable AI output → must fall back for any multi-page PDF that looks like a binder,
  // or for any PDF when there's literally nothing to work with.
  if (!segments || segments.length === 0) return looksLikeBinder;

  // Single segment covering the whole document is the same as "AI did not split" —
  // for a likely binder, fall back to page ranges so the user can review.
  if (segments.length === 1) {
    const s = segments[0];
    const coversAll = (s.start_page ?? 1) <= 1 && (s.end_page ?? 0) >= pageCount;
    const isOtherLowConf = s.type === "Other" && (s.confidence ?? 0) < 0.7;
    if (looksLikeBinder) return true;
    if (coversAll && isOtherLowConf) return true;
    return false;
  }

  // Multiple segments but the first/dominant one is "Other" and weak → likely bad split.
  const dominant = [...segments].sort((a, b) => (b.end_page - b.start_page) - (a.end_page - a.start_page))[0];
  if (looksLikeBinder && dominant?.type === "Other" && (dominant.confidence ?? 0) < 0.5) return true;

  return false;
}

export function inferTypeFromPageText(text: string, allowedTypes: string[]): { type: string; suggested_label?: string | null } {
  const allowed = new Set(getAllowedDocumentTypes(allowedTypes));
  const rules: Array<[RegExp, string, string?]> = [
    [/passport|republic of|nationality|surname|given names|mrz|date of expiry/i, "Passport"],
    [/ielts|toefl|pte|duolingo|test report form|candidate details|language proficiency/i, "English Language Proficiency Test"],
    [/transcript|marksheet|statement of marks|degree|diploma|provisional certificate|semester|university/i, "Academic Transcripts"],
    [/offer letter|letter of acceptance|admission|accepted to|program of study/i, "Offer Letter"],
    [/bank statement|statement of account|account balance|closing balance|available balance/i, "Financial Documents"],
    [/guaranteed investment certificate|\bgic\b|blocked account/i, "GIC Certificate"],
    [/tuition|fee receipt|payment receipt|fees paid/i, "Tuition Fee Receipt"],
    [/statement of purpose|personal statement|\bsop\b/i, "Statement of Purpose"],
    [/resume|curriculum vitae|\bcv\b|work experience/i, "Updated Resume"],
    [/imm\s?\d{4}|application for|visa application|family information/i, "Visa Forms"],
    [/employment letter|experience letter|salary slip|pay slip|no objection certificate|\bnoc\b/i, "Employment Letter"],
    [/affidavit of support|sponsor|sponsorship|invitation letter/i, "Affidavit of Support"],
    [/birth certificate|date of birth|place of birth/i, "Birth Certificate"],
    [/marriage certificate/i, "Marriage Certificate"],
    [/police clearance|\bpcc\b/i, "Police Clearance"],
  ];
  for (const [rx, preferred] of rules) {
    if (!rx.test(text)) continue;
    if (allowed.has(preferred)) return { type: preferred };
    if (preferred === "English Language Proficiency Test" && allowed.has("IELTS / Language Test")) return { type: "IELTS / Language Test" };
    if (preferred === "Statement of Purpose" && allowed.has("SOP")) return { type: "SOP" };
    if (preferred === "Updated Resume" && allowed.has("Resume")) return { type: "Resume" };
    return { type: "Other", suggested_label: preferred };
  }
  return { type: "Other", suggested_label: null };
}

/** Get the page count of a PDF File. Returns 0 on failure or non-PDF. */
export async function getPdfPageCount(file: File): Promise<number> {
  try {
    const buf = await file.arrayBuffer();
    const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
    return pdf.getPageCount();
  } catch {
    try {
      const pdfjs = await (async () => {
        const mod = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        mod.GlobalWorkerOptions.workerSrc = (worker as { default: string }).default;
        return mod;
      })();
      const buf = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
      return doc.numPages || 0;
    } catch {
      return 0;
    }
  }
}

/** Whether a file is a PDF (by mime type or extension). */
export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

/**
 * Per-page text snippets via pdfjs (returns "" for scans without text layer).
 * Bounded to keep payload sizes reasonable.
 */
export async function extractPerPageText(file: File, maxPages = 30, maxCharsPerPage = 1000): Promise<string[]> {
  // Lazy import to keep main bundle small.
  const pdfjs = await (async () => {
    const mod = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    mod.GlobalWorkerOptions.workerSrc = (worker as { default: string }).default;
    return mod;
  })();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const out: string[] = [];
  const pages = Math.min(maxPages, doc.numPages);
  for (let i = 1; i <= pages; i++) {
    try {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((it) => ("str" in it ? (it as { str: string }).str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxCharsPerPage);
      out.push(text);
    } catch {
      out.push("");
    }
  }
  return out;
}

/**
 * Build a new PDF File containing only pages [start..end] (1-based inclusive)
 * from the source PDF.
 */
export async function extractPagesAsPdfFile(
  file: File,
  startPage: number,
  endPage: number,
  outName: string,
): Promise<File> {
  const buf = await file.arrayBuffer();
  const src = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = src.getPageCount();
  const start = Math.max(1, Math.min(startPage, total));
  const end = Math.max(start, Math.min(endPage, total));
  const indices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices);
  copied.forEach((p) => out.addPage(p));
  const bytes = await out.save({ useObjectStreams: true });
  return new File([new Uint8Array(bytes)], outName, { type: "application/pdf" });
}

/** Render up to `maxPages` of the PDF as low-res JPEG data URLs for the AI splitter. */
export async function getBinderPageImages(file: File, maxPages = 30): Promise<string[]> {
  // Low DPI / quality on purpose — payload is sent to the edge function.
  return renderPdfPagesToJpegDataUrls(file, maxPages, 90, 0.55);
}