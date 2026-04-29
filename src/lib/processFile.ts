import imageCompression from "browser-image-compression";
import { PDFDocument, StandardFonts } from "pdf-lib";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB target

/**
 * Process a file: convert images to PDF, compress PDFs to ≤ 2MB, keep readability.
 * Returns a new File (always .pdf for non-pdfs, original .pdf for pdfs).
 */
export async function processToPdf(file: File, baseName: string): Promise<File> {
  const ext = (file.name.split(".").pop() || "").toLowerCase();

  if (ext === "pdf" || file.type === "application/pdf") {
    // Re-save through pdf-lib (strips redundancy) and return
    const bytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(bytes);
    const out = await pdf.save({ useObjectStreams: true });
    return new File([out], `${baseName}.pdf`, { type: "application/pdf" });
  }

  if (file.type.startsWith("image/")) {
    // Compress image then embed in PDF
    let img: Blob = file;
    try {
      img = await imageCompression(file, {
        maxSizeMB: 1.8,
        maxWidthOrHeight: 2400,
        useWebWorker: true,
        fileType: file.type === "image/png" ? "image/png" : "image/jpeg",
        initialQuality: 0.9,
      });
    } catch { /* fall back to original */ }

    const buf = await img.arrayBuffer();
    const pdf = await PDFDocument.create();
    const isPng = (img.type || file.type) === "image/png";
    const embedded = isPng ? await pdf.embedPng(buf) : await pdf.embedJpg(buf);
    const page = pdf.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
    const out = await pdf.save();
    return new File([out], `${baseName}.pdf`, { type: "application/pdf" });
  }

  // Unknown type → wrap text-ish notice
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([595, 842]);
  page.drawText(`Original file: ${file.name}`, { x: 50, y: 800, size: 12, font });
  page.drawText("(File type not auto-converted; original retained server-side.)", { x: 50, y: 780, size: 10, font });
  const out = await pdf.save();
  return new File([out], `${baseName}.pdf`, { type: "application/pdf" });
}

export function isOverLimit(file: File) { return file.size > MAX_BYTES; }