/** Static worker served from public/pdf.worker.min.mjs (see scripts/copy-pdf-worker.mjs). */
export const PDF_WORKER_SRC = "/pdf.worker.min.mjs";

export function configurePdfWorker(
  GlobalWorkerOptions: { workerSrc: string },
): void {
  GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
}
