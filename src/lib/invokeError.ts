// Surface the real edge-function error body instead of supabase-js's generic
// "Edge Function returned a non-2xx status code" string.
export async function invokeError(error: any, data: any): Promise<string | null> {
  if (data && typeof data === "object" && (data as any).error) return String((data as any).error);
  if (!error) return null;
  try {
    const ctx = (error as any).context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json();
      if (body?.error) return String(body.error);
    } else if (ctx && typeof ctx.text === "function") {
      const txt = await ctx.text();
      try { const j = JSON.parse(txt); if (j?.error) return String(j.error); } catch {}
      if (txt) return txt;
    }
  } catch {}
  return error?.message ?? "Request failed";
}