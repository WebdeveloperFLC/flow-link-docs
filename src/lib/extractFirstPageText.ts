// Lazy-load pdfjs to avoid blocking initial bundle
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then(async (mod) => {
      // Use the bundled worker via Vite ?url import
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      mod.GlobalWorkerOptions.workerSrc = (worker as { default: string }).default;
      return mod;
    });
  }
  return pdfjsPromise;
}

export async function extractFirstPageText(file: File, maxChars = 2000): Promise<string> {
  try {
    const pdfjs = await getPdfjs();
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
    const pagesToScan = Math.min(2, doc.numPages);
    let text = "";
    for (let i = 1; i <= pagesToScan; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((it) => ("str" in it ? (it as { str: string }).str : "")).join(" ");
      text += pageText + "\n";
      if (text.length >= maxChars) break;
    }
    return text.slice(0, maxChars).replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

export async function renderFirstPdfPageToJpegDataUrl(file: File, dpi = 140, quality = 0.78): Promise<string> {
  try {
    const pdfjs = await getPdfjs();
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: dpi / 72 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return "";
  }
}

export async function rasterizePdfToJpegs(file: File, dpi = 150, quality = 0.75): Promise<Blob[]> {
  const pdfjs = await getPdfjs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const out: Blob[] = [];
  const scale = dpi / 72;
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b ?? new Blob()), "image/jpeg", quality)
    );
    out.push(blob);
  }
  return out;
}