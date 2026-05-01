import { PDFDocument } from "pdf-lib";
import { renderPdfPagesToJpegDataUrls } from "@/lib/extractFirstPageText";

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

/** Get the page count of a PDF File. Returns 0 on failure or non-PDF. */
export async function getPdfPageCount(file: File): Promise<number> {
  try {
    const buf = await file.arrayBuffer();
    const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
    return pdf.getPageCount();
  } catch {
    return 0;
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