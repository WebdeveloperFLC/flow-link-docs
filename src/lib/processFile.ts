import imageCompression from "browser-image-compression";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { rasterizePdfToJpegs } from "@/lib/extractFirstPageText";

// IRCC accepts up to 4MB per file. We aim a bit lower for safety.
export const IRCC_MAX_BYTES = 4 * 1024 * 1024;
const TARGET_BYTES = 3.8 * 1024 * 1024;

/**
 * Process a file: convert images to PDF, compress to ≤ ~4MB (IRCC limit), keep readability.
 * Returns a new File (always .pdf for non-pdfs, original .pdf for pdfs).
 */
export async function processToPdf(file: File, baseName: string): Promise<File> {
  const ext = (file.name.split(".").pop() || "").toLowerCase();

  if (ext === "pdf" || file.type === "application/pdf") {
    const bytes = await file.arrayBuffer();
    // 1. Try a clean re-save through pdf-lib. If the source PDF is encrypted
    //    (even with an empty password — common for exported résumés/scans),
    //    pdf-lib's `ignoreEncryption` keeps the encrypted streams intact, which
    //    produces a file that browsers refuse to render ("Failed to load PDF
    //    document"). We detect this and force the rasterize path below, which
    //    rebuilds an unencrypted PDF from page images.
    let isEncrypted = false;
    let out: Uint8Array | null = null;
    try {
      const pdf = await PDFDocument.load(bytes);
      out = await pdf.save({ useObjectStreams: true });
    } catch {
      // Most likely encrypted. Try once more with ignoreEncryption only to
      // confirm — but do NOT trust the resulting bytes for serving.
      try {
        await PDFDocument.load(bytes, { ignoreEncryption: true });
        isEncrypted = true;
      } catch {
        isEncrypted = true;
      }
    }
    if (!isEncrypted && out && out.byteLength <= TARGET_BYTES) {
      return new File([new Uint8Array(out)], `${baseName}.pdf`, { type: "application/pdf" });
    }
    // 2. Rasterize each page → JPEG → rebuild PDF. This both guarantees a
    //    small size AND strips any source-side encryption so the file is
    //    universally viewable.
    try {
      const blob = new File([new Uint8Array(bytes)], file.name, { type: "application/pdf" });
      const qualitySteps: Array<{ dpi: number; q: number }> = [
        { dpi: 170, q: 0.82 },
        { dpi: 150, q: 0.78 },
        { dpi: 130, q: 0.7 },
        { dpi: 110, q: 0.6 },
      ];
      for (const step of qualitySteps) {
        const jpegs = await rasterizePdfToJpegs(blob, step.dpi, step.q);
        if (jpegs.length === 0) continue;
        const rebuilt = await PDFDocument.create();
        for (const j of jpegs) {
          const img = await rebuilt.embedJpg(new Uint8Array(await j.arrayBuffer()));
          const pg = rebuilt.addPage([img.width, img.height]);
          pg.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        }
        out = await rebuilt.save({ useObjectStreams: true });
        if (out.byteLength <= TARGET_BYTES) break;
      }
    } catch {
      // fall through to whatever `out` we have
    }
    if (!out) {
      // Last-ditch: pass the original bytes through. Better than nothing.
      out = new Uint8Array(bytes);
    }
    return new File([new Uint8Array(out)], `${baseName}.pdf`, { type: "application/pdf" });
  }

  if (file.type.startsWith("image/")) {
    // Multi-step image compression to land under TARGET_BYTES
    const steps = [
      { maxSizeMB: 3.5, q: 0.88, w: 2400 },
      { maxSizeMB: 2.5, q: 0.78, w: 2200 },
      { maxSizeMB: 1.8, q: 0.68, w: 2000 },
      { maxSizeMB: 1.2, q: 0.55, w: 1800 },
    ];
    let img: Blob = file;
    for (const s of steps) {
      try {
        img = await imageCompression(file, {
          maxSizeMB: s.maxSizeMB,
          maxWidthOrHeight: s.w,
          useWebWorker: true,
          fileType: file.type === "image/png" ? "image/png" : "image/jpeg",
          initialQuality: s.q,
        });
        if (img.size <= TARGET_BYTES) break;
      } catch { /* try next step */ }
    }
    const buf = await img.arrayBuffer();
    const pdf = await PDFDocument.create();
    const isPng = (img.type || file.type) === "image/png";
    const embedded = isPng ? await pdf.embedPng(buf) : await pdf.embedJpg(buf);
    const page = pdf.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
    const out = await pdf.save();
    return new File([new Uint8Array(out)], `${baseName}.pdf`, { type: "application/pdf" });
  }

  // Unknown type → wrap text-ish notice
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([595, 842]);
  page.drawText(`Original file: ${file.name}`, { x: 50, y: 800, size: 12, font });
  page.drawText("(File type not auto-converted; original retained server-side.)", { x: 50, y: 780, size: 10, font });
  const out = await pdf.save();
  return new File([new Uint8Array(out)], `${baseName}.pdf`, { type: "application/pdf" });
}

export function isOverLimit(file: File) { return file.size > IRCC_MAX_BYTES; }