// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Convert a .docx into lightly-marked-up plain text we can feed back to the AI as a style sample.
 * Headings → `# ` / `## `; numPr items → `- `; bold runs → **text**.
 */
function docxToStyleText(zip: JSZip): string {
  const file = zip.file("word/document.xml");
  if (!file) return "";
  const xml = (file as any).asText ? (file as any).asText() : "";
  // We must call asText synchronously after loading, but JSZip in Deno needs async — handled below.
  return xml;
}

async function parseDocxToMarkdown(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const docFile = zip.file("word/document.xml");
  if (!docFile) return "";
  const xml = await docFile.async("string");

  // Extract paragraphs
  const paraRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  const out: string[] = [];
  let pm: RegExpExecArray | null;
  while ((pm = paraRe.exec(xml)) !== null) {
    const inner = pm[1];
    const styleMatch = inner.match(/<w:pStyle\s+w:val="([^"]+)"/);
    const isBullet = /<w:numPr\b/.test(inner);
    const styleId = styleMatch?.[1] ?? "";
    const isH1 = /^Heading1$|^Title$/i.test(styleId);
    const isH2 = /^Heading2$|^Heading3$/i.test(styleId);

    // Concatenate runs, marking bold
    const runRe = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g;
    const segs: string[] = [];
    let rm: RegExpExecArray | null;
    while ((rm = runRe.exec(inner)) !== null) {
      const rinner = rm[1];
      const isBold = /<w:b\b\s*\/>|<w:b\b[^/]*\/>|<w:b\b[^>]*>/.test(rinner);
      const textRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
      let tm: RegExpExecArray | null;
      let txt = "";
      while ((tm = textRe.exec(rinner)) !== null) {
        txt += tm[1]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"');
      }
      if (!txt) continue;
      segs.push(isBold ? `**${txt}**` : txt);
    }
    const text = segs.join("").trim();
    if (!text) { out.push(""); continue; }
    if (isH1) out.push(`# ${text}`);
    else if (isH2) out.push(`## ${text}`);
    else if (isBullet) out.push(`- ${text}`);
    else out.push(text);
  }
  // Collapse 3+ blank lines
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supaUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supaUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const file_path = String(body?.file_path ?? "");
    if (!file_path) return json({ error: "file_path required" }, 400);

    const { data: blob, error } = await admin.storage.from("letter-templates").download(file_path);
    if (error || !blob) throw error ?? new Error("file not found");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const md = await parseDocxToMarkdown(bytes);
    if (!md) return json({ error: "Could not read text from .docx" }, 400);
    return json({ ok: true, style_text: md, length: md.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});