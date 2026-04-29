import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Encode a JS value as XML-RPC <value>. Supports string, number, boolean, array, object (struct). */
function xmlValue(v: unknown): string {
  if (v === null || v === undefined) return `<value><string></string></value>`;
  if (typeof v === "boolean") return `<value><boolean>${v ? 1 : 0}</boolean></value>`;
  if (typeof v === "number") {
    if (Number.isInteger(v)) return `<value><int>${v}</int></value>`;
    return `<value><double>${v}</double></value>`;
  }
  if (typeof v === "string") return `<value><string>${xmlEscape(v)}</string></value>`;
  if (Array.isArray(v)) {
    return `<value><array><data>${v.map(xmlValue).join("")}</data></array></value>`;
  }
  if (typeof v === "object") {
    const members = Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `<member><name>${xmlEscape(k)}</name>${xmlValue(val)}</member>`)
      .join("");
    return `<value><struct>${members}</struct></value>`;
  }
  return `<value><string></string></value>`;
}

function buildCall(method: string, params: unknown[]): string {
  return `<?xml version="1.0"?><methodCall><methodName>${method}</methodName><params>${params
    .map((p) => `<param>${xmlValue(p)}</param>`)
    .join("")}</params></methodCall>`;
}

/** Very small XML-RPC response parser: returns first <value> as JS value. */
function parseValue(xml: string, pos: { i: number }): unknown {
  const open = xml.indexOf("<value>", pos.i);
  if (open === -1) return null;
  pos.i = open + "<value>".length;
  // skip whitespace
  while (pos.i < xml.length && /\s/.test(xml[pos.i])) pos.i++;
  if (xml.startsWith("<int>", pos.i) || xml.startsWith("<i4>", pos.i)) {
    const tag = xml.startsWith("<int>", pos.i) ? "int" : "i4";
    const end = xml.indexOf(`</${tag}>`, pos.i);
    const num = parseInt(xml.slice(pos.i + tag.length + 2, end), 10);
    pos.i = xml.indexOf("</value>", end) + "</value>".length;
    return num;
  }
  if (xml.startsWith("<boolean>", pos.i)) {
    const end = xml.indexOf("</boolean>", pos.i);
    const v = xml.slice(pos.i + 9, end).trim() === "1";
    pos.i = xml.indexOf("</value>", end) + "</value>".length;
    return v;
  }
  if (xml.startsWith("<double>", pos.i)) {
    const end = xml.indexOf("</double>", pos.i);
    const v = parseFloat(xml.slice(pos.i + 8, end));
    pos.i = xml.indexOf("</value>", end) + "</value>".length;
    return v;
  }
  if (xml.startsWith("<string>", pos.i)) {
    const end = xml.indexOf("</string>", pos.i);
    const v = xml.slice(pos.i + 8, end);
    pos.i = xml.indexOf("</value>", end) + "</value>".length;
    return v
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  }
  if (xml.startsWith("<array>", pos.i)) {
    pos.i += "<array>".length;
    const dataStart = xml.indexOf("<data>", pos.i);
    pos.i = dataStart + "<data>".length;
    const arr: unknown[] = [];
    while (true) {
      while (pos.i < xml.length && /\s/.test(xml[pos.i])) pos.i++;
      if (xml.startsWith("</data>", pos.i)) {
        pos.i = xml.indexOf("</value>", pos.i) + "</value>".length;
        return arr;
      }
      arr.push(parseValue(xml, pos));
    }
  }
  if (xml.startsWith("<struct>", pos.i)) {
    pos.i += "<struct>".length;
    const obj: Record<string, unknown> = {};
    while (true) {
      while (pos.i < xml.length && /\s/.test(xml[pos.i])) pos.i++;
      if (xml.startsWith("</struct>", pos.i)) {
        pos.i = xml.indexOf("</value>", pos.i) + "</value>".length;
        return obj;
      }
      // <member><name>x</name><value>...</value></member>
      const memberStart = xml.indexOf("<member>", pos.i);
      const nameStart = xml.indexOf("<name>", memberStart) + "<name>".length;
      const nameEnd = xml.indexOf("</name>", nameStart);
      const name = xml.slice(nameStart, nameEnd);
      pos.i = nameEnd;
      const v = parseValue(xml, pos);
      obj[name] = v;
      pos.i = xml.indexOf("</member>", pos.i) + "</member>".length;
    }
  }
  // fallback: empty string
  const end = xml.indexOf("</value>", pos.i);
  const v = xml.slice(pos.i, end);
  pos.i = end + "</value>".length;
  return v;
}

function parseResponse(xml: string): { ok: true; value: unknown } | { ok: false; fault: string } {
  if (xml.includes("<fault>")) {
    const m = xml.match(/<name>faultString<\/name><value>(?:<string>)?([^<]*)/);
    return { ok: false, fault: m?.[1] ?? "Odoo fault" };
  }
  const pos = { i: 0 };
  return { ok: true, value: parseValue(xml, pos) };
}

async function odooCall(url: string, endpoint: "/xmlrpc/2/common" | "/xmlrpc/2/object", method: string, params: unknown[]) {
  const resp = await fetch(url.replace(/\/$/, "") + endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body: buildCall(method, params),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Odoo HTTP ${resp.status}: ${text.slice(0, 300)}`);
  const parsed = parseResponse(text);
  if (!parsed.ok) throw new Error(parsed.fault);
  return parsed.value;
}

async function authenticate(url: string, db: string, login: string, password: string): Promise<number> {
  const uid = await odooCall(url, "/xmlrpc/2/common", "authenticate", [db, login, password, {}]);
  if (typeof uid !== "number" || uid <= 0) throw new Error("Odoo authentication failed (check URL, DB, login, key)");
  return uid;
}

async function execute(url: string, db: string, uid: number, password: string, model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}) {
  return await odooCall(url, "/xmlrpc/2/object", "execute_kw", [db, uid, password, model, method, args, kwargs]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    // Auth: require a logged-in user (any signed-in counselor/admin)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const ODOO_URL = Deno.env.get("ODOO_URL");
    const ODOO_DB = Deno.env.get("ODOO_DB");
    const ODOO_LOGIN = Deno.env.get("ODOO_LOGIN");
    const ODOO_API_KEY = Deno.env.get("ODOO_API_KEY");
    if (!ODOO_URL || !ODOO_DB || !ODOO_LOGIN || !ODOO_API_KEY) {
      return json({ ok: false, error: "Odoo not configured. Set ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY in settings." }, 400);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "ping");

    if (action === "ping") {
      const version = await odooCall(ODOO_URL, "/xmlrpc/2/common", "version", []);
      const uid = await authenticate(ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY);
      return json({ ok: true, uid, version });
    }

    if (action === "upsert_client") {
      const clientId = String(body?.client_id ?? "");
      if (!clientId) return json({ ok: false, error: "client_id required" }, 400);

      // Service role for full read
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: client } = await admin.from("clients").select("*").eq("id", clientId).maybeSingle();
      if (!client) return json({ ok: false, error: "client not found" }, 404);
      const { data: profile } = await admin.from("client_profile").select("*").eq("client_id", clientId).maybeSingle();

      const ref = `fovel_client_${clientId}`;
      const uid = await authenticate(ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY);

      // Compose comment with fields Odoo doesn't have native columns for
      const commentLines = [
        `Fovel application: ${client.application_id}`,
        `Country: ${client.country}`,
        `Application type: ${client.application_type}`,
        `Status: ${client.status}`,
      ];
      if (profile?.passport_number) commentLines.push(`Passport: ${profile.passport_number}`);
      if (profile?.date_of_birth) commentLines.push(`DOB: ${profile.date_of_birth}`);
      if (profile?.nationality) commentLines.push(`Nationality: ${profile.nationality}`);
      if (profile?.ielts_overall) commentLines.push(`IELTS overall: ${profile.ielts_overall}`);
      if (profile?.highest_qualification) commentLines.push(`Highest qualification: ${profile.highest_qualification}`);
      if (profile?.institution_name) commentLines.push(`Institution: ${profile.institution_name}`);
      if (profile?.bank_name) commentLines.push(`Bank: ${profile.bank_name}`);

      const partnerVals: Record<string, unknown> = {
        name: client.full_name,
        email: client.email || profile?.email_alt || false,
        phone: client.phone || profile?.phone_alt || false,
        ref: client.application_id,
        comment: commentLines.join("\n"),
        is_company: false,
        customer_rank: 1,
        street: profile?.address_line1 || false,
        city: profile?.address_city || false,
        zip: profile?.address_postal || false,
      };
      // strip undefined
      for (const k of Object.keys(partnerVals)) if (partnerVals[k] === undefined) delete partnerVals[k];

      // Look up by ref
      const existing = await execute(ODOO_URL, ODOO_DB, uid, ODOO_API_KEY, "res.partner", "search", [[["ref", "=", client.application_id]]], { limit: 1 });
      let partnerId: number;
      if (Array.isArray(existing) && existing.length > 0) {
        partnerId = existing[0] as number;
        await execute(ODOO_URL, ODOO_DB, uid, ODOO_API_KEY, "res.partner", "write", [[partnerId], partnerVals]);
      } else {
        const created = await execute(ODOO_URL, ODOO_DB, uid, ODOO_API_KEY, "res.partner", "create", [partnerVals]);
        partnerId = created as number;
      }
      return json({ ok: true, partner_id: partnerId, ref });
    }

    return json({ ok: false, error: `unknown action: ${action}` }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error("odoo-sync error:", msg);
    return json({ ok: false, error: msg }, 500);
  }
});