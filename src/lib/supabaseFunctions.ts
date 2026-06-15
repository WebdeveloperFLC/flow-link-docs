/** Surface backend `{ error: "..." }` from supabase.functions.invoke failures. */
export async function parseSupabaseFunctionError(error: unknown): Promise<string> {
  if (!(error instanceof Error)) return "Request failed";
  try {
    const ctx = (error as { context?: { json?: () => Promise<{ error?: string; message?: string }> } }).context;
    if (ctx?.json) {
      const body = await ctx.json();
      if (typeof body?.error === "string" && body.error.trim()) return body.error;
      if (typeof body?.message === "string" && body.message.trim()) return body.message;
    }
  } catch {
    /* ignore */
  }
  return error.message || "Request failed";
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
