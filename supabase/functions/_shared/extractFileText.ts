// Shared helper to pull usable text (and an optional base64 payload for
// multimodal models) out of an uploaded document stored in Supabase Storage.
//
// PDFs are parsed with unpdf (pure JS, works in Deno).
// Plain-text / CSV / JSON / XML go through Blob.text().
// Images / scanned PDFs return base64 so callers can send them as an
// `image_url` data URL to Gemini via the Lovable AI gateway.

import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

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