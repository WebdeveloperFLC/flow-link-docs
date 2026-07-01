const STORAGE_KEY = "flc-debug-c5260a";
const ENDPOINT = "http://127.0.0.1:7861/ingest/bda2c8c0-2fff-4fe0-b6f7-be98b8c0ed66";

/** Boot-path diagnostics (sessionStorage + local ingest when available). */
export function bootDebugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = "pre-fix",
): void {
  const payload = {
    sessionId: "c5260a",
    location,
    message,
    data,
    hypothesisId,
    timestamp: Date.now(),
    runId,
  };
  try {
    const prev = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]") as unknown[];
    prev.push(payload);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prev.slice(-80)));
  } catch {
    /* noop */
  }
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c5260a" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
