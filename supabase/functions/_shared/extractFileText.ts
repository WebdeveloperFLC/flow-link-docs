// Shared helper to pull usable text (and an optional base64 payload for
// multimodal models) out of an uploaded document stored in Supabase Storage.
//
// PDFs are parsed with unpdf (pure JS, works in Deno).
// Plain-text / CSV / JSON / XML go through Blob.text().
// Images / scanned PDFs return base64 so callers can send them as an
// `image_url` data URL to Gemini via the Lovable AI gateway.

import { extractText, getDocumentProxy, renderPageAsImage } from "https://esm.sh/unpdf@0.12.1";

export interface ExtractResult {
  text: string;
  inlineMime?: string;     // e.g. "application/pdf" or "image/png"
  inlineBase64?: string;   // base64 payload for multimodal fallback
  pageCount?: number;
  warning?: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Per-page text for a PDF. `pages` is 1-indexed; failed pages get "". */
export interface PdfPagesResult {
  pageCount: number;
  pages: string[];        // index 0 = page 1
  pagesNeedingOcr: number[]; // 1-indexed page numbers with <50 chars
}

export async function extractPdfPages(blob: Blob): Promise<PdfPagesResult> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const pdf = await getDocumentProxy(buf);
  const pageCount = pdf.numPages;
  const pages: string[] = [];
  const pagesNeedingOcr: number[] = [];
  // unpdf's extractText supports mergePages:false to return string[]
  try {
    const { text } = await extractText(pdf, { mergePages: false });
    const arr = Array.isArray(text) ? text : [String(text || "")];
    for (let i = 0; i < pageCount; i++) {
      const t = (arr[i] ?? "").toString().trim();
      pages.push(t);
      if (t.length < 50) pagesNeedingOcr.push(i + 1);
    }
  } catch (_e) {
    for (let i = 0; i < pageCount; i++) {
      pages.push("");
      pagesNeedingOcr.push(i + 1);
    }
  }
  return { pageCount, pages, pagesNeedingOcr };
}

/** Render one PDF page to a base64 PNG for vision input. 1-indexed. */
export async function renderPdfPageBase64(
  blob: Blob,
  pageNumber: number,
  scale = 1.5,
): Promise<{ mime: string; base64: string } | null> {
  try {
    const buf = new Uint8Array(await blob.arrayBuffer());
    const pdf = await getDocumentProxy(buf);
    const img = await renderPageAsImage(pdf, pageNumber, { scale, canvas: () => new OffscreenCanvas(1, 1) as any });
    // unpdf returns ArrayBuffer of PNG bytes
    const bytes = new Uint8Array(img as ArrayBuffer);
    return { mime: "image/png", base64: toBase64(bytes) };
  } catch (_e) {
    return null;
  }
}

/** Build OpenAI-style multimodal content with multiple inline page images. */
export function buildMultiImageContent(
  textPrompt: string,
  images: Array<{ mime: string; base64: string }>,
): Array<Record<string, unknown>> {
  const parts: Array<Record<string, unknown>> = [{ type: "text", text: textPrompt }];
  for (const img of images) {
    parts.push({
      type: "image_url",
      image_url: { url: `data:${img.mime};base64,${img.base64}` },
    });
  }
  return parts;
}

function isPdf(mime?: string, name?: string) {
  if (mime && mime.toLowerCase().includes("pdf")) return true;
  if (name && name.toLowerCase().endsWith(".pdf")) return true;
  return false;
}

function isPlainText(mime?: string, name?: string) {
  const m = (mime || "").toLowerCase();
  if (m.startsWith("text/")) return true;
  if (m.includes("json") || m.includes("xml") || m.includes("csv")) return true;
  if (name) {
    const n = name.toLowerCase();
    if (n.endsWith(".txt") || n.endsWith(".csv") || n.endsWith(".json") || n.endsWith(".xml") || n.endsWith(".md")) return true;
  }
  return false;
}

function isImage(mime?: string, name?: string) {
  if (mime && mime.toLowerCase().startsWith("image/")) return true;
  if (name && /\.(png|jpe?g|webp|gif|bmp)$/i.test(name)) return true;
  return false;
}

export async function extractFileText(
  blob: Blob,
  opts: { mime?: string; fileName?: string; maxChars?: number } = {},
): Promise<ExtractResult> {
  const { mime, fileName } = opts;
  const maxChars = opts.maxChars ?? 120_000;

  if (isPlainText(mime, fileName)) {
    try {
      const t = await blob.text();
      return { text: t.slice(0, maxChars) };
    } catch {
      return { text: "" };
    }
  }

  if (isImage(mime, fileName)) {
    const buf = new Uint8Array(await blob.arrayBuffer());
    return {
      text: "",
      inlineMime: mime || "image/png",
      inlineBase64: toBase64(buf),
    };
  }

  if (isPdf(mime, fileName)) {
    const buf = new Uint8Array(await blob.arrayBuffer());
    try {
      const pdf = await getDocumentProxy(buf);
      const pageCount = pdf.numPages;
      const { text } = await extractText(pdf, { mergePages: true });
      const flat = (Array.isArray(text) ? text.join("\n\n") : String(text || "")).trim();
      if (flat.length > 50) {
        return { text: flat.slice(0, maxChars), pageCount };
      }
      // Scanned PDF — no embedded text. Fall back to inline PDF for Gemini.
      return {
        text: "",
        pageCount,
        inlineMime: "application/pdf",
        inlineBase64: toBase64(buf),
        warning: "PDF has no embedded text; sent inline for OCR.",
      };
    } catch (e) {
      // Last-resort: ship the bytes inline so the model can try.
      return {
        text: "",
        inlineMime: "application/pdf",
        inlineBase64: toBase64(buf),
        warning: `PDF parse failed: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  // Unknown binary — best-effort text, otherwise empty.
  try {
    const t = await blob.text();
    return { text: t.slice(0, maxChars), warning: "Unknown mime; tried blob.text()." };
  } catch {
    return { text: "", warning: "Unsupported binary; nothing to extract." };
  }
}

/** Build OpenAI-style multimodal content parts for the Lovable AI gateway. */
export function buildAiContent(
  textPrompt: string,
  res: ExtractResult,
): Array<Record<string, unknown>> | string {
  if (!res.inlineBase64) return textPrompt;
  return [
    { type: "text", text: textPrompt },
    {
      type: "image_url",
      image_url: { url: `data:${res.inlineMime};base64,${res.inlineBase64}` },
    },
  ];
}