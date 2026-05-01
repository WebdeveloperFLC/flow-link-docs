import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Resolve a stored client document into an in-app previewable URL (object URL).
 * Caller is responsible for revoking it. Returns null on failure.
 */
export async function getStoredDocumentObjectUrl(opts: {
  storagePath: string;
  fileName?: string;
  mimeType?: string | null;
}): Promise<{ url: string; mime: string } | null> {
  try {
    const { data, error } = await supabase.storage
      .from("client-documents")
      .download(opts.storagePath);
    if (error || !data) return null;
    const buf = await data.arrayBuffer();
    if (buf.byteLength === 0) return null;
    const guessed = (opts.fileName ?? "").toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : opts.mimeType || "application/pdf";
    const blob = new Blob([buf], { type: guessed });
    return { url: URL.createObjectURL(blob), mime: guessed };
  } catch {
    return null;
  }
}

/**
 * Open a stored client document in a new tab. Single source of truth for
 * "View" buttons across the app so behavior is consistent for scanned PDFs,
 * images, and any other mime type we save into the `client-documents` bucket.
 *
 * Strategy:
 *  1. Open a blank tab synchronously (before any await) so popup blockers
 *     allow it because it's tied to the user click.
 *  2. Download the bytes, build a blob URL, navigate the new tab to it.
 *  3. If the synchronous open failed (blocker), fall back to a
 *     programmatic anchor click which most browsers permit during the
 *     same gesture.
 *  4. As a last resort, force a download so the user still gets the file.
 */
export async function openClientDocument(opts: {
  storagePath: string;
  fileName?: string;
  mimeType?: string | null;
}): Promise<boolean> {
  // Step 1: open the tab synchronously to avoid popup blockers.
  const winRef = typeof window !== "undefined" ? window.open("", "_blank") : null;
  try {
    const { data, error } = await supabase.storage
      .from("client-documents")
      .download(opts.storagePath);
    if (error || !data) {
      winRef?.close();
      toast.error("Couldn't open document — file may be missing or corrupted. Re-upload it.");
      return false;
    }
    const buf = await data.arrayBuffer();
    if (buf.byteLength === 0) {
      winRef?.close();
      toast.error("This file appears to be empty. Re-upload it.");
      return false;
    }
    const guessed = (opts.fileName ?? "").toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : opts.mimeType || "application/pdf";
    const blob = new Blob([buf], { type: guessed });
    const url = URL.createObjectURL(blob);
    if (winRef && !winRef.closed) {
      try { winRef.location.href = url; } catch { /* ignore */ }
    } else {
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
    winRef?.close();
    toast.error(e instanceof Error ? e.message : "Failed to open document");
    return false;
  }
}

/**
 * Open a local File (not yet uploaded) in a new tab. Used by upload review
 * queues. Same popup-blocker strategy as openClientDocument.
 */
export function previewLocalFile(file: File): void {
  const winRef = typeof window !== "undefined" ? window.open("", "_blank") : null;
  try {
    const url = URL.createObjectURL(file);
    if (winRef && !winRef.closed) {
      try { winRef.location.href = url; } catch { /* ignore */ }
    } else {
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
    winRef?.close();
    toast.error("Preview unavailable for this file");
  }
}

/**
 * Build an in-app preview source for a local File. Returns an object URL the
 * caller must revoke. Pair with the InlinePreviewDialog component for an
 * embedded preview (no popup, no new tab) so the View button works even when
 * popups are blocked.
 */
export function buildLocalPreviewUrl(file: File): { url: string; mime: string } {
  const lowerName = file.name.toLowerCase();
  const mime = lowerName.endsWith(".pdf") ? "application/pdf" : file.type || "application/octet-stream";
  const previewBlob = file.type === mime ? file : new Blob([file], { type: mime });
  const url = URL.createObjectURL(previewBlob);
  return { url, mime };
}