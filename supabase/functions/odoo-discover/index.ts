// Odoo discovery: lists models that look like course/program/university data
// and (optionally) returns field metadata + 3 sample rows for a chosen model.
// Reuses ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY secrets.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ---------- minimal XML-RPC (same shape as odoo-sync) ----------
function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function xmlValue(v: unknown): string {
  if (v === null || v === undefined) return `<value><string></string></value>`;
  if (typeof v === "boolean") return `<value><boolean>${v ? 1 : 0}</boolean></value>`;
  if (typeof v === "number") return Number.isInteger(v)
    ? `<value><int>${v}</int></value>`
    : `<value><double>${v}</double></value>`;
  if (typeof v === "string") return `<value><string>${xmlEscape(v)}</string></value>`;
  if (Array.isArray(v)) return `<value><array><data>${v.map(xmlValue).join("")}</data></array></value>`;
  if (typeof v === "object") {
    const m = Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `<member><name>${xmlEscape(k)}</name>${xmlValue(val)}</member>`).join("");
    return `<value><struct>${m}</struct></value>`;
  }
  return `<value><string></string></value>`;
}
function buildCall(method: string, params: unknown[]) {
  return `<?xml version="1.0"?><methodCall><methodName>${method}</methodName><params>${
    params.map((p) => `<param>${xmlValue(p)}</param>`).join("")
  }</params></methodCall>`;
}
function parseValue(xml: string, pos: { i: number }): unknown {
  const open = xml.indexOf("<value>", pos.i);
  if (open === -1) return null;
  pos.i = open + 7;
  while (pos.i < xml.length && /\s/.test(xml[pos.i])) pos.i++;
  if (xml.startsWith("<int>", pos.i) || xml.startsWith("<i4>", pos.i)) {
    const tag = xml.startsWith("<int>", pos.i) ? "int" : "i4";
    const end = xml.indexOf(`</${tag}>`, pos.i);
    const n = parseInt(xml.slice(pos.i + tag.length + 2, end), 10);
    pos.i = xml.indexOf("</value>", end) + 8;
    return n;
  }
  if (xml.startsWith("<boolean>", pos.i)) {
    const end = xml.indexOf("</boolean>", pos.i);
    const v = xml.slice(pos.i + 9, end).trim() === "1";
    pos.i = xml.indexOf("</value>", end) + 8;
    return v;
  }
  if (xml.startsWith("<double>", pos.i)) {
    const end = xml.indexOf("</double>", pos.i);
    const v = parseFloat(xml.slice(pos.i + 8, end));
    pos.i = xml.indexOf("</value>", end) + 8;
    return v;
  }
  if (xml.startsWith("<string>", pos.i)) {
    const end = xml.indexOf("</string>", pos.i);
    const v = xml.slice(pos.i + 8, end);
    pos.i = xml.indexOf("</value>", end) + 8;
    return v.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  }
  if (xml.startsWith("<array>", pos.i)) {
    pos.i += 7;
    pos.i = xml.indexOf("<data>", pos.i) + 6;
    const arr: unknown[] = [];
    while (true) {
      while (pos.i < xml.length && /\s/.test(xml[pos.i])) pos.i++;
      if (xml.startsWith("</data>", pos.i)) {
        pos.i = xml.indexOf("</value>", pos.i) + 8;
        return arr;
      }
      arr.push(parseValue(xml, pos));
    }
  }
  if (xml.startsWith("<struct>", pos.i)) {
    pos.i += 8;
    const obj: Record<string, unknown> = {};
    while (true) {
      while (pos.i < xml.length && /\s/.test(xml[pos.i])) pos.i++;
      if (xml.startsWith("</struct>", pos.i)) {
        pos.i = xml.indexOf("</value>", pos.i) + 8;
        return obj;
      }
      const ms = xml.indexOf("<member>", pos.i);
      const ns = xml.indexOf("<name>", ms) + 6;
      const ne = xml.indexOf("</name>", ns);
      const name = xml.slice(ns, ne);
      pos.i = ne;
      obj[name] = parseValue(xml, pos);
      pos.i = xml.indexOf("</member>", pos.i) + 9;
    }
  }
  const end = xml.indexOf("</value>", pos.i);
  const v = xml.slice(pos.i, end);
  pos.i = end + 8;
  return v;
}
function parseResponse(xml: string): { ok: true; value: unknown } | { ok: false; fault: string } {
  if (xml.includes("<fault>")) {
    const m = xml.match(/<name>faultString<\/name>\s*<value>\s*(?:<string>)?([\s\S]*?)(?:<\/string>)?\s*<\/value>/);
    return { ok: false, fault: (m?.[1] ?? "Odoo fault").slice(0, 400) };
  }
  return { ok: true, value: parseValue(xml, { i: 0 }) };
}
async function odooCall(url: string, ep: string, method: string, params: unknown[]) {
  const r = await fetch(url.replace(/\/$/, "") + ep, {
    method: "POST", headers: { "Content-Type": "text/xml" },
    body: buildCall(method, params),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`Odoo HTTP ${r.status}: ${t.slice(0, 300)}`);
  const p = parseResponse(t);
  if (!p.ok) throw new Error(p.fault);
  return p.value;
}
const exec = (url: string, db: string, uid: number, pw: string, model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}) =>
  odooCall(url, "/xmlrpc/2/object", "execute_kw", [db, uid, pw, model, method, args, kwargs]);

// ---------- handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    // Auth: must be a logged-in admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const URL_ = Deno.env.get("ODOO_COURSES_URL") ?? Deno.env.get("ODOO_URL");
    const DB = Deno.env.get("ODOO_COURSES_DB") ?? Deno.env.get("ODOO_DB");
    const LOGIN = Deno.env.get("ODOO_COURSES_LOGIN") ?? Deno.env.get("ODOO_LOGIN");
    const KEY = Deno.env.get("ODOO_COURSES_API_KEY") ?? Deno.env.get("ODOO_API_KEY");
    if (!URL_ || !DB || !LOGIN || !KEY) return json({ ok: false, error: "Odoo not configured" }, 400);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "list_models");

    const uid = await odooCall(URL_, "/xmlrpc/2/common", "authenticate", [DB, LOGIN, KEY, {}]);
    if (typeof uid !== "number" || uid <= 0) throw new Error("Odoo authentication failed");

    if (action === "list_models") {
      const keywords: string[] = body?.keywords ?? [
        "course", "program", "education", "school", "university",
        "faculty", "student", "academic", "subject", "degree", "op."
      ];
      const domain: unknown[] = ["|".repeat(keywords.length - 1),
        ...keywords.flatMap((k) => [["model", "ilike", k]])];
      const ids = await exec(URL_, DB, uid, KEY, "ir.model", "search", [domain], { limit: 200 });
      const rows = await exec(URL_, DB, uid, KEY, "ir.model", "read",
        [ids], { fields: ["model", "name", "modules"] });
      return json({ ok: true, uid, count: (rows as unknown[]).length, models: rows });
    }

    if (action === "describe_model") {
      const model = String(body?.model ?? "");
      if (!model) return json({ ok: false, error: "model required" }, 400);
      const fields = await exec(URL_, DB, uid, KEY, model, "fields_get", [],
        { attributes: ["string", "type", "required", "relation", "selection"] });
      let sample: unknown[] = [];
      try {
        const sids = await exec(URL_, DB, uid, KEY, model, "search", [[]], { limit: 3 });
        if (Array.isArray(sids) && sids.length) {
          sample = await exec(URL_, DB, uid, KEY, model, "read", [sids]) as unknown[];
        }
      } catch { /* sample is best-effort */ }
      return json({ ok: true, model, fields, sample });
    }

    return json({ ok: false, error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});