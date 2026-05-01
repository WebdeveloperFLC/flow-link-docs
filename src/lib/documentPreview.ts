import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Open a stored client document in a new tab. Single source of truth for
 * "View" buttons across the app so behavior is consistent for scanned PDFs,
 * images, and any other mime type we save into the `client-documents` bucket.
 *
 * - Downloads the file via the SDK (respects RLS / signed paths).
 * - Forces the correct mime type so the browser previews inline instead of
 *   downloading.
 * - Falls back to a programmatic anchor click when popup blockers swallow
 *   `window.open`.
 * - Emits a clear toast if bytes can't be retrieved instead of failing
 *   silently.
 */
export async function openClientDocument(opts: {
  storagePath: string;
  fileName?: string;
  mimeType?: string | null;
}): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from("client-documents")
      .download(opts.storagePath);
    if (error || !data) {
      toast.error("Couldn't open document — file may be missing or corrupted. Re-upload it.");
      return false;
    }
    const buf = await data.arrayBuffer();
    if (buf.byteLength === 0) {
      toast.error("This file appears to be empty. Re-upload it.");
      return false;
    }
    const guessed = (opts.fileName ?? "").toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : opts.mimeType || "application/pdf";
    const blob = new Blob([buf], { type: guessed });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      if (opts.fileName) a.download = opts.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Failed to open document");
    return false;
  }
}

/**
 * Open a local File (not yet uploaded) in a new tab so the user can sanity
 * check it before confirming a label / owner. Used by upload review queues.
 */
export function previewLocalFile(file: File): void {
  try {
    const url = URL.createObjectURL(file);
    const win = window.open(url, "_blank");
    if (!win) {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    toast.error("Preview unavailable for this file");
  }
}