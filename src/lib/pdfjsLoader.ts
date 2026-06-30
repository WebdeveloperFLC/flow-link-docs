import { configurePdfWorker } from "@/lib/pdfWorker";

/** Match package.json pdfjs-dist — loaded from CDN in production so Vite skips wasm assets. */
const PDFJS_VERSION = "5.7.284";
const PDFJS_CDN = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.mjs`;
const PDFJS_WORKER_CDN = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

export type PdfJsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfJsModule> | null = null;

function normalizePdfJsModule(mod: Record<string, unknown>): PdfJsModule {
  const candidate = (mod.default ?? mod) as PdfJsModule;
  return candidate;
}

/** Lazy-load pdfjs — dev uses node_modules; production uses CDN (@vite-ignore, not bundled). */
export async function loadPdfjs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      if (import.meta.env.DEV) {
        const mod = normalizePdfJsModule(
          (await import("pdfjs-dist")) as unknown as Record<string, unknown>,
        );
        configurePdfWorker(mod.GlobalWorkerOptions);
        return mod;
      }

      const mod = normalizePdfJsModule(
        (await import(/* @vite-ignore */ PDFJS_CDN)) as Record<string, unknown>,
      );
      mod.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
      return mod;
    })();
  }
  return pdfjsPromise;
}
