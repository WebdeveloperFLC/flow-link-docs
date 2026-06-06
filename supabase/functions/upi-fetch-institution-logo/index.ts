import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "institution-logos";
const MAX_BYTES = 2 * 1024 * 1024;
const FETCH_UA = "FlowLinkInstitutionBot/1.0 (+institution-logo-fetch)";

const COUNTRY_MAP: Record<string, string> = {
  canada: "CA",
  "united states": "US",
  usa: "US",
  uk: "GB",
  "united kingdom": "GB",
  australia: "AU",
  "new zealand": "NZ",
  ireland: "IE",
};

type InstitutionRow = {
  id: string;
  name: string;
  website_url: string | null;
  logo_url: string | null;
  country_name: string | null;
};

type FetchOneResult = {
  id: string;
  name: string;
  ok: boolean;
  skipped?: boolean;
  logo_url?: string | null;
  source?: string;
  error?: string;
};

function countryCode(name: string | null | undefined): string {
  const t = (name ?? "").toLowerCase().trim();
  return COUNTRY_MAP[t] ?? "CA";
}

function normalizeWebsiteUrl(raw: string): URL | null {
  let s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    return new URL(s);
  } catch {
    return null;
  }
}

function domainFromUrl(url: URL): string {
  return url.hostname.replace(/^www\./i, "");
}

function extFromContentType(contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("svg")) return "svg";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("png")) return "png";
  if (ct.includes("x-icon") || ct.includes("vnd.microsoft.icon")) return "ico";
  return "png";
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = 8000,
  accept = "image/*,*/*;q=0.8",
): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": FETCH_UA,
        Accept: accept,
      },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function downloadImage(url: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const res = await fetchWithTimeout(url);
  if (!res?.ok) return null;
  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!contentType.startsWith("image/")) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength < 200 || buf.byteLength > MAX_BYTES) return null;
  return { bytes: buf, contentType };
}

function metaContent(html: string, key: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function linkIcons(html: string): string[] {
  const icons: string[] = [];
  const re = /<link[^>]+rel=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const rel = m[1].toLowerCase();
    if (!/(^|\s)(apple-touch-icon|icon|shortcut icon)(\s|$)/.test(rel)) continue;
    const tag = m[0];
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (href) icons.push(href);
  }
  return icons;
}

function resolveUrl(base: URL, href: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

async function fetchHomepageHtml(base: URL): Promise<string | null> {
  const res = await fetchWithTimeout(base.href, 10000, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8");
  if (!res?.ok) return null;
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("text/html") && !ct.includes("application/xhtml")) return null;
  const text = await res.text();
  return text.slice(0, 500_000);
}

async function logoCandidates(websiteUrl: string): Promise<string[]> {
  const base = normalizeWebsiteUrl(websiteUrl);
  if (!base) return [];
  const domain = domainFromUrl(base);
  const out: string[] = [`https://logo.clearbit.com/${domain}`];

  const html = await fetchHomepageHtml(base);
  if (html) {
    for (const key of ["og:image", "og:image:url", "twitter:image", "twitter:image:src"]) {
      const v = metaContent(html, key);
      if (v) out.push(resolveUrl(base, v));
    }
    for (const href of linkIcons(html)) out.push(resolveUrl(base, href));
    out.push(resolveUrl(base, "/favicon.ico"));
  }

  return [...new Set(out.filter(Boolean))];
}

async function syncLogoToCourseFinder(
  supabase: ReturnType<typeof createClient>,
  inst: InstitutionRow,
  logoUrl: string | null,
): Promise<void> {
  if (!inst.name) return;
  const code = countryCode(inst.country_name);
  await supabase
    .from("cf_universities")
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq("country_code", code)
    .ilike("name", inst.name);
}

async function persistLogo(
  supabase: ReturnType<typeof createClient>,
  inst: InstitutionRow,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const ext = extFromContentType(contentType);
  const path = `${inst.id}/logo.${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (upErr) throw upErr;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  const { error: dbErr } = await supabase
    .from("upi_institutions")
    .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", inst.id);
  if (dbErr) throw dbErr;
  await syncLogoToCourseFinder(supabase, inst, publicUrl);
  return publicUrl;
}

async function fetchLogoForInstitution(
  supabase: ReturnType<typeof createClient>,
  inst: InstitutionRow,
  force: boolean,
): Promise<FetchOneResult> {
  if (inst.logo_url && !force) {
    return { id: inst.id, name: inst.name, ok: true, skipped: true, logo_url: inst.logo_url };
  }
  if (!inst.website_url?.trim()) {
    return { id: inst.id, name: inst.name, ok: false, error: "no_website" };
  }

  const candidates = await logoCandidates(inst.website_url);
  for (const candidate of candidates) {
    const img = await downloadImage(candidate);
    if (!img) continue;
    try {
      const publicUrl = await persistLogo(supabase, inst, img.bytes, img.contentType);
      return { id: inst.id, name: inst.name, ok: true, logo_url: publicUrl, source: candidate };
    } catch (e) {
      return {
        id: inst.id,
        name: inst.name,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return { id: inst.id, name: inst.name, ok: false, error: "not_found" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: canManage } = await admin.rpc("can_manage_upi_catalog", { _uid: userData.user.id });
    if (!canManage) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const force = Boolean(body.force);
    let ids: string[] = [];

    if (typeof body.institution_id === "string") {
      ids = [body.institution_id];
    } else if (Array.isArray(body.institution_ids)) {
      ids = body.institution_ids.filter((id: unknown) => typeof id === "string");
    } else if (body.only_missing) {
      const { data: rows, error } = await admin
        .from("upi_institutions")
        .select("id")
        .is("logo_url", null)
        .not("website_url", "is", null);
      if (error) throw error;
      ids = (rows ?? []).map((r) => r.id);
    }

    if (!ids.length) {
      return new Response(JSON.stringify({ ok: true, results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: institutions, error: loadErr } = await admin
      .from("upi_institutions")
      .select("id,name,website_url,logo_url,country_name")
      .in("id", ids);
    if (loadErr) throw loadErr;

    const results: FetchOneResult[] = [];
    for (const inst of (institutions ?? []) as InstitutionRow[]) {
      results.push(await fetchLogoForInstitution(admin, inst, force));
    }

    const fetched = results.filter((r) => r.ok && !r.skipped).length;
    const skipped = results.filter((r) => r.skipped).length;
    const failed = results.filter((r) => !r.ok).length;

    return new Response(JSON.stringify({ ok: true, fetched, skipped, failed, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
