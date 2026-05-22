import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";

/** Append every page of `src` into `out` using the most reliable method available.
 *  pdf-lib's `copyPages` is known to silently drop content for PDFs with compressed
 *  object streams, form XObjects, AcroForms, or scanner-flattened pages. Embedding
 *  each page as a Form XObject via `embedPdf` + `drawPage` carries the full resource
 *  dictionary along, which preserves visible content in those cases. We try that
 *  first and fall back to `copyPages` only if embedding fails. */
async function appendAllPages(out: PDFDocument, src: PDFDocument): Promise<number> {
  const indices = src.getPageIndices();
  if (indices.length === 0) return 0;

  try {
    const embedded = await out.embedPdf(src, indices);
    let added = 0;
    for (let i = 0; i < embedded.length; i++) {
      const emb = embedded[i];
      const srcPage = src.getPage(indices[i]);
      const { width, height } = srcPage.getSize();
      const page = out.addPage([width, height]);
      page.drawPage(emb, { x: 0, y: 0, width, height });
      added++;
    }
    return added;
  } catch {
    // Fallback: classic copyPages. Less reliable but works for simple PDFs.
    try {
      const pages = await out.copyPages(src, indices);
      pages.forEach((p) => out.addPage(p));
      return pages.length;
    } catch {
      return 0;
    }
  }
}

/** Download multiple PDFs from the client-documents bucket and merge their pages
 *  in order into a single PDF. Non-PDF files are skipped. Returns the merged bytes. */
export async function combinePdfsFromStorage(paths: string[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const path of paths) {
    const { data, error } = await supabase.storage.from("client-documents").download(path);
    if (error || !data) continue;
    try {
      const buf = new Uint8Array(await data.arrayBuffer());
      const src = await PDFDocument.load(buf, {
        ignoreEncryption: true,
        updateMetadata: false,
        throwOnInvalidObject: false,
      });
      await appendAllPages(out, src);
    } catch {
      /* skip files we can't load (e.g. .docx) */
    }
  }
  return out.save();
}

/** Exposed for use by the binder cover/TOC generator so it can reuse the same
 *  reliable page-append logic when stitching individual section documents. */
export { appendAllPages };