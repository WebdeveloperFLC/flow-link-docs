import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";

/** Download multiple PDFs from the client-documents bucket and merge their pages
 *  in order into a single PDF. Non-PDF files are skipped. Returns the merged bytes. */
export async function combinePdfsFromStorage(paths: string[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const path of paths) {
    const { data, error } = await supabase.storage.from("client-documents").download(path);
    if (error || !data) continue;
    try {
      const buf = new Uint8Array(await data.arrayBuffer());
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    } catch {
      /* skip files we can't load (e.g. .docx) */
    }
  }
  return out.save();
}