// Live search against the FLC Odoo "flc.course" model.
// Builds an Odoo search domain from the Course Finder filter payload, then
// calls flc.course.search_read via XML-RPC (with JSON-RPC fallback).
//
// Field-name mappings live in FILTER_MAP and READ_FIELDS so they can be
// tuned in one place once the live schema is confirmed.

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

/* ---------------- XML-RPC + JSON-RPC (same as odoo-discover) ------------- */

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
async function odooCallXmlRpc(url: string, ep: string, method: string, params: unknown[]) {
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
async function odooCallJsonRpc(url: string, service: string, method: string, args: unknown[]) {
  const r = await fetch(url.replace(/\/$/, "") + "/jsonrpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: Date.now() }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`Odoo HTTP ${r.status}: ${t.slice(0, 300)}`);
  let parsed: any;
  try { parsed = JSON.parse(t); } catch { throw new Error(`Odoo non-JSON response: ${t.slice(0, 300)}`); }
  if (parsed.error) {
    const msg = parsed.error?.data?.message || parsed.error?.message || JSON.stringify(parsed.error);
    throw new Error(String(msg).slice(0, 400));
  }
  return parsed.result;
}
async function odooCall(url: string, ep: string, method: string, params: unknown[]) {
  try { return await odooCallXmlRpc(url, ep, method, params); }
  catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/CSRF|<!DOCTYPE|<html|HTTP 4\d\d/i.test(msg)) {
      const service = ep.includes("/common") ? "common" : "object";
      return await odooCallJsonRpc(url, service, method, params);
    }
    throw e;
  }
}
const exec = (url: string, db: string, uid: number, pw: string, model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}) =>
  odooCall(url, "/xmlrpc/2/object", "execute_kw", [db, uid, pw, model, method, args, kwargs]);

/* ---------------- Filter mapping ----------------------------------------- */

// UI label → Odoo selection key heuristic: lowercased; spaces → underscore.
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

type Filters = Record<string, unknown>;
type Domain = unknown[];

function notEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "boolean") return v;
  return true;
}
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildDomain(f: Filters): Domain {
  const c: Domain[] = [];

  // ---- Top filters ----
  if (Array.isArray(f.countries) && f.countries.length) {
    // f.countries is array of ISO codes from COUNTRY_LIST
    c.push(["country_id.code", "in", f.countries]);
  }
  if (Array.isArray(f.states) && f.states.length) {
    // state names entered as tags
    c.push(["state_id.name", "in", f.states]);
  }
  if (notEmpty(f.city)) c.push(["city", "ilike", String(f.city)]);
  if (notEmpty(f.studyArea)) c.push(["study_area_id.name", "ilike", String(f.studyArea)]);
  if (notEmpty(f.disciplineArea)) c.push(["discipline_area_id.name", "ilike", String(f.disciplineArea)]);
  if (notEmpty(f.programLevel)) c.push(["program_level_id.name", "ilike", String(f.programLevel)]);
  if (notEmpty(f.courseIntake)) c.push(["intake_ids.name", "ilike", String(f.courseIntake)]);
  if (notEmpty(f.year)) c.push(["intake_ids.year", "=", Number(f.year)]);
  if (notEmpty(f.semester)) c.push(["intake_ids.semester", "ilike", String(f.semester)]);
  if (notEmpty(f.month)) c.push(["intake_ids.month", "ilike", String(f.month)]);

  // ---- English / Language / Aptitude proficiency ----
  // Interpretation: if a user enters their score, return courses whose required
  // minimum is <= that score (so the course is reachable).
  if (notEmpty(f.englishProficiency)) {
    const test = slug(String(f.englishProficiency));      // e.g. "ielts", "toefl_ibt"
    const score = num(f.englishScore);
    if (score !== null) c.push([`${test}_min_score`, "<=", score]);
  }
  if (notEmpty(f.languageEligibility)) {
    const lang = slug(String(f.languageEligibility));
    if (notEmpty(f.languageScore)) c.push([`${lang}_min_level`, "<=", String(f.languageScore)]);
  }
  if (notEmpty(f.aptitudeEligibility)) {
    const test = slug(String(f.aptitudeEligibility));     // gre, gmat, sat...
    const score = num(f.aptitudeScore);
    if (score !== null) c.push([`${test}_min_score`, "<=", score]);
  }

  // ---- Advanced ----
  if (notEmpty(f.institute)) c.push(["institute_id.name", "ilike", String(f.institute)]);
  if (notEmpty(f.instituteCampus)) c.push(["campus_id.name", "ilike", String(f.instituteCampus)]);
  if (notEmpty(f.programAvailability)) c.push(["availability", "=", slug(String(f.programAvailability))]);
  if (notEmpty(f.programDeliveryMode)) c.push(["delivery_mode", "=", slug(String(f.programDeliveryMode))]);
  if (notEmpty(f.currency)) c.push(["currency_id.name", "=", String(f.currency)]);
  if (notEmpty(f.gradingScale)) c.push(["grading_scale", "ilike", String(f.gradingScale)]);

  const gmin = num(f.gradeScoreMin), gmax = num(f.gradeScoreMax);
  if (gmin !== null) c.push(["min_grade_score", "<=", gmin]);
  if (gmax !== null) c.push(["min_grade_score", ">=", 0]); // keep noop placeholder
  const tmin = num(f.tuitionMin), tmax = num(f.tuitionMax);
  if (tmin !== null) c.push(["tuition_fee", ">=", tmin]);
  if (tmax !== null) c.push(["tuition_fee", "<=", tmax]);

  if (f.gmatWaiver) c.push(["gmat_waiver", "=", true]);
  if (f.greWaiver) c.push(["gre_waiver", "=", true]);
  if (f.satWaiver) c.push(["sat_waiver", "=", true]);
  if (f.withoutMaths) c.push(["without_maths", "=", true]);
  if (f.stemCourse) c.push(["is_stem", "=", true]);

  if (notEmpty(f.conditionalAcceptance) && f.conditionalAcceptance !== "Either") {
    c.push(["conditional_acceptance", "=", f.conditionalAcceptance === "Yes"]);
  }
  if (notEmpty(f.educationGap)) {
    const g = num(f.educationGap);
    if (g !== null) c.push(["max_education_gap", ">=", g]);
  }
  if (notEmpty(f.numberOfBacklogs)) {
    const b = num(f.numberOfBacklogs);
    if (b !== null) c.push(["max_backlogs", ">=", b]);
  }
  if (notEmpty(f.scholarshipAvailable) && f.scholarshipAvailable !== "Either") {
    c.push(["scholarship_available", "=", f.scholarshipAvailable === "Yes"]);
  }
  if (notEmpty(f.countryOfCitizenship)) c.push(["accepts_citizenship_ids.name", "ilike", String(f.countryOfCitizenship)]);
  if (notEmpty(f.countryOfResidence)) c.push(["accepts_residence_ids.name", "ilike", String(f.countryOfResidence)]);

  if (f.applicationFeesWaiver) c.push(["application_fee_waiver", "=", true]);
  if (f.germanLanguageTestWaiver) c.push(["german_test_waiver", "=", true]);
  if (f.englishProficiencyTestWaiver) c.push(["english_test_waiver", "=", true]);
  if (f.frenchLanguageTestWaiver) c.push(["french_test_waiver", "=", true]);

  // Odoo polish-notation AND is implicit between top-level leaves.
  return c;
}

const READ_FIELDS = [
  "id", "name", "display_name",
  "institute_id", "campus_id",
  "country_id", "state_id", "city",
  "study_area_id", "discipline_area_id", "program_level_id",
  "intake_ids", "delivery_mode", "availability",
  "tuition_fee", "currency_id", "application_fee",
  "scholarship_available", "is_stem",
  "ielts_min_score", "toefl_min_score", "pte_min_score", "duolingo_min_score",
  "gre_min_score", "gmat_min_score", "sat_min_score",
  "gmat_waiver", "gre_waiver", "sat_waiver",
  "application_fee_waiver", "english_test_waiver",
  "german_test_waiver", "french_test_waiver",
  "duration", "duration_unit", "url", "website",
];

/* ---------------- handler ------------------------------------------------- */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);

    const URL_ = Deno.env.get("ODOO_COURSES_URL") ?? Deno.env.get("ODOO_URL");
    const DB = Deno.env.get("ODOO_COURSES_DB") ?? Deno.env.get("ODOO_DB");
    const LOGIN = Deno.env.get("ODOO_COURSES_LOGIN") ?? Deno.env.get("ODOO_LOGIN");
    const KEY = Deno.env.get("ODOO_COURSES_API_KEY") ?? Deno.env.get("ODOO_API_KEY");
    if (!URL_ || !DB || !LOGIN || !KEY) {
      return json({ ok: false, error: "Odoo course catalogue not configured" }, 400);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "search");

    const uid = await odooCall(URL_, "/xmlrpc/2/common", "authenticate", [DB, LOGIN, KEY, {}]);
    if (typeof uid !== "number" || uid <= 0) throw new Error("Odoo authentication failed");

    if (action === "search") {
      const filters = (body?.filters ?? {}) as Filters;
      const limit = Math.max(1, Math.min(200, Number(body?.limit ?? 50)));
      const offset = Math.max(0, Number(body?.offset ?? 0));
      const order = typeof body?.order === "string" ? body.order : "name asc";

      const domain = buildDomain(filters);

      // Total count
      let total = 0;
      try {
        total = Number(await exec(URL_, DB, uid, KEY, "flc.course", "search_count", [domain])) || 0;
      } catch { /* ignore */ }

      // Try with curated fields first; if the schema rejects unknown fields,
      // fall back to reading all fields so the UI can still show something.
      let rows: unknown[] = [];
      try {
        rows = await exec(URL_, DB, uid, KEY, "flc.course", "search_read",
          [domain], { fields: READ_FIELDS, limit, offset, order }) as unknown[];
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/Invalid field|does not exist|unknown/i.test(msg)) {
          rows = await exec(URL_, DB, uid, KEY, "flc.course", "search_read",
            [domain], { limit, offset, order: "id desc" }) as unknown[];
        } else {
          throw e;
        }
      }

      return json({ ok: true, total, count: rows.length, offset, limit, courses: rows });
    }

    if (action === "describe") {
      const fields = await exec(URL_, DB, uid, KEY, "flc.course", "fields_get", [],
        { attributes: ["string", "type", "required", "relation", "selection"] });
      return json({ ok: true, fields });
    }

    return json({ ok: false, error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});