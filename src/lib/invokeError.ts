// Surface the real edge-function error body instead of supabase-js's generic
// "Edge Function returned a non-2xx status code" string.
import { directorReadOnlyMessage, isDirectorReadOnlyError } from "@/lib/performanceDirectorReadOnly";

export async function invokeError(error: unknown, data: unknown): Promise<string | null> {
  const responseData = data as { error?: unknown; raw?: unknown; code?: string } | null;
  if (responseData && typeof responseData === "object") {
    if (isDirectorReadOnlyError(typeof responseData.error === "string" ? responseData.error : null, responseData)) {
      return directorReadOnlyMessage(null, responseData);
    }
    if (responseData.error) {
      return responseData.raw ? `${String(responseData.error)}\nRaw SMTP response: ${String(responseData.raw)}` : String(responseData.error);
    }
  }
  if (!error) return null;
  try {
    const ctx = (error as { context?: { json?: () => Promise<{ error?: unknown; raw?: unknown }>; text?: () => Promise<string> }; message?: string }).context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json();
      if (isDirectorReadOnlyError(typeof body?.error === "string" ? body.error : null, body)) {
        return directorReadOnlyMessage(null, body);
      }
      if (body?.error) return body?.raw ? `${String(body.error)}\nRaw SMTP response: ${String(body.raw)}` : String(body.error);
    } else if (ctx && typeof ctx.text === "function") {
      const txt = await ctx.text();
      try { const j = JSON.parse(txt) as { error?: unknown; raw?: unknown }; if (j?.error) return j?.raw ? `${String(j.error)}\nRaw SMTP response: ${String(j.raw)}` : String(j.error); } catch { /* keep original text */ }
      if (txt) return txt;
    }
  } catch { /* fall back to generic error message */ }
  return (error as { message?: string })?.message ?? "Request failed";
}