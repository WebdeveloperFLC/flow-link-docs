/** Deterministic program page parser — no AI, no inference, no institution defaults. */

export type ParsedProgramPageFields = {
  campus_name?: string | null;
  duration_value?: number | null;
  duration_unit?: string | null;
  tuition_fee?: number | null;
  currency?: string | null;
  intake_months?: string[] | null;
  ielts_overall?: number | null;
  ielts_min_component?: number | null;
  pte_overall?: number | null;
  toefl_overall?: number | null;
  duolingo_overall?: number | null;
  application_fee?: number | null;
  is_coop?: boolean | null;
  is_pgwp_eligible?: boolean | null;
  course_description?: string | null;
  is_online?: boolean | null;
  metadata?: Record<string, unknown>;
};

export const OFFICIAL_PROGRAM_PAGE_CONFIDENCE = 100;

function decodeHtml(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripTags(html: string): string {
  return decodeHtml(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseNumber(raw: unknown): number | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const m = text.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function parseBool(raw: unknown): boolean | null {
  if (raw == null) return null;
  const t = String(raw).trim().toLowerCase();
  if (!t) return null;
  if (["yes", "true", "y", "1", "eligible", "available", "included"].includes(t)) return true;
  if (["no", "false", "n", "0", "not eligible", "unavailable", "none"].includes(t)) return false;
  return null;
}

function parseIntakes(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const list = raw.map(String).map((s) => s.trim()).filter(Boolean);
    return list.length ? list : null;
  }
  const text = String(raw).trim();
  if (!text) return null;
  const list = text.split(/[,;/|•]+/).map((s) => s.trim()).filter(Boolean);
  return list.length ? list : null;
}

function parseDuration(raw: unknown): { value: number; unit: string } | null {
  if (raw == null) return null;
  const text = String(raw).trim().toLowerCase();
  if (!text) return null;
  const m = text.match(/(\d+(?:\.\d+)?)\s*(year|years|yr|yrs|month|months|mo|semester|semesters|week|weeks)/i);
  if (!m) {
    const n = parseNumber(text);
    return n != null ? { value: n, unit: "years" } : null;
  }
  const value = Number(m[1]);
  let unit = m[2].toLowerCase();
  if (unit.startsWith("yr") || unit === "y" || unit === "year") unit = "years";
  else if (unit.startsWith("mo") || unit.startsWith("month")) unit = "months";
  else if (unit.startsWith("sem")) unit = "semesters";
  else if (unit.startsWith("week")) unit = "weeks";
  return Number.isFinite(value) ? { value, unit } : null;
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

type LabelRule = {
  match: RegExp;
  apply: (value: string, out: ParsedProgramPageFields) => void;
};

const LABEL_RULES: LabelRule[] = [
  {
    match: /^ielts\s*(overall|minimum|min\.?\s*overall)?$/i,
    apply: (v, o) => {
      const n = parseNumber(v);
      if (n != null) o.ielts_overall = n;
    },
  },
  {
    match: /^ielts\s*(min(imum)?\s*band|no\s*band|component|each\s*band)/i,
    apply: (v, o) => {
      const n = parseNumber(v);
      if (n != null) o.ielts_min_component = n;
    },
  },
  {
    match: /^pte(\s*score|\s*overall)?$/i,
    apply: (v, o) => {
      const n = parseNumber(v);
      if (n != null) o.pte_overall = n;
    },
  },
  {
    match: /^toefl(\s*score|\s*overall|\s*ibt)?$/i,
    apply: (v, o) => {
      const n = parseNumber(v);
      if (n != null) o.toefl_overall = n;
    },
  },
  {
    match: /^duolingo(\s*score|\s*english\s*test)?$/i,
    apply: (v, o) => {
      const n = parseNumber(v);
      if (n != null) o.duolingo_overall = n;
    },
  },
  {
    match: /^(campus|campus location|location|campuses)$/i,
    apply: (v, o) => {
      const t = v.trim();
      if (t) o.campus_name = t;
    },
  },
  {
    match: /^(duration|program length|length|program duration)$/i,
    apply: (v, o) => {
      const d = parseDuration(v);
      if (d) {
        o.duration_value = d.value;
        o.duration_unit = d.unit;
      }
    },
  },
  {
    match: /^(tuition|tuition fee|tuition fees|international tuition)$/i,
    apply: (v, o) => {
      const n = parseNumber(v);
      if (n != null) {
        o.tuition_fee = n;
        if (/cad/i.test(v)) o.currency = "CAD";
        else if (/usd/i.test(v)) o.currency = "USD";
      }
    },
  },
  {
    match: /^(application fee|application fees|app fee)$/i,
    apply: (v, o) => {
      const n = parseNumber(v);
      if (n != null) o.application_fee = n;
    },
  },
  {
    match: /^(intakes?|start dates?|intake dates?|program starts?)$/i,
    apply: (v, o) => {
      const list = parseIntakes(v);
      if (list) o.intake_months = list;
    },
  },
  {
    match: /^(co-?op|cooperative education|internship)$/i,
    apply: (v, o) => {
      const b = parseBool(v);
      if (b != null) o.is_coop = b;
    },
  },
  {
    match: /^pgwp(\s*eligible)?$/i,
    apply: (v, o) => {
      const b = parseBool(v);
      if (b != null) o.is_pgwp_eligible = b;
    },
  },
  {
    match: /^(moi|medium of instruction|moi accepted)$/i,
    apply: (v, o) => {
      const b = parseBool(v);
      if (b != null) {
        o.metadata = { ...(o.metadata ?? {}), moi_accepted: b };
      }
    },
  },
  {
    match: /^(deposit|required deposit|seat deposit)$/i,
    apply: (v, o) => {
      const n = parseNumber(v);
      if (n != null) o.metadata = { ...(o.metadata ?? {}), required_deposit: n };
    },
  },
  {
    match: /^processing time$/i,
    apply: (v, o) => {
      const t = v.trim();
      if (t) o.metadata = { ...(o.metadata ?? {}), processing_time: t };
    },
  },
  {
    match: /^(backlog|backlogs|backlog policy|number of backlogs)$/i,
    apply: (v, o) => {
      const n = parseNumber(v);
      o.metadata = { ...(o.metadata ?? {}), backlogs_allowed: n ?? v.trim() };
    },
  },
  {
    match: /^(delivery mode|program delivery|delivery)$/i,
    apply: (v, o) => {
      const t = v.trim();
      if (t) o.metadata = { ...(o.metadata ?? {}), program_delivery_mode: t };
      if (/online/i.test(t)) o.is_online = true;
    },
  },
  {
    match: /^(admission requirements|english requirements|language requirements)$/i,
    apply: (v, o) => {
      const t = v.trim();
      if (t) o.metadata = { ...(o.metadata ?? {}), admission_requirements: t };
    },
  },
];

function applyLabelValue(label: string, value: string, out: ParsedProgramPageFields): void {
  const norm = normalizeLabel(label);
  const val = value.trim();
  if (!norm || !val) return;
  for (const rule of LABEL_RULES) {
    if (rule.match.test(norm) || rule.match.test(label.trim())) {
      rule.apply(val, out);
      return;
    }
  }
}

function extractJsonLdObjects(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) parsed.forEach((x) => typeof x === "object" && x && out.push(x as Record<string, unknown>));
      else if (parsed && typeof parsed === "object") out.push(parsed as Record<string, unknown>);
    } catch {
      /* skip invalid JSON-LD */
    }
  }
  return out;
}

function mergeJsonLd(out: ParsedProgramPageFields, obj: Record<string, unknown>): void {
  const type = String(obj["@type"] ?? "").toLowerCase();
  if (!type.includes("course") && !type.includes("program") && !type.includes("education")) return;

  if (!out.course_description && typeof obj.description === "string") {
    out.course_description = obj.description.trim();
  }
  if (out.duration_value == null && obj.timeRequired) {
    const d = parseDuration(obj.timeRequired);
    if (d) {
      out.duration_value = d.value;
      out.duration_unit = d.unit;
    }
  }
  if (out.tuition_fee == null && obj.offers && typeof obj.offers === "object") {
    const offer = obj.offers as Record<string, unknown>;
    const price = parseNumber(offer.price);
    if (price != null) out.tuition_fee = price;
    if (typeof offer.priceCurrency === "string") out.currency = offer.priceCurrency;
  }
  if (typeof obj.educationalCredentialAwarded === "string") {
    out.metadata = {
      ...(out.metadata ?? {}),
      program_level: String(obj.educationalCredentialAwarded).trim(),
    };
  }
}

function extractDefinitionListPairs(html: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const block of html.matchAll(/<dl[\s\S]*?<\/dl>/gi)) {
    const items = [...block[0].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi)];
    for (const item of items) {
      pairs.push([stripTags(item[1]), stripTags(item[2])]);
    }
  }
  return pairs;
}

function extractTablePairs(html: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const row of html.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const cells = [...row[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => stripTags(c[1]));
    if (cells.length === 2 && cells[0] && cells[1]) pairs.push([cells[0], cells[1]]);
  }
  return pairs;
}

function extractListLabelBlocks(html: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const li of html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
    const text = stripTags(li[1]);
    const m = text.match(/^([^:]{3,80}):\s*(.+)$/);
    if (m) pairs.push([m[1].trim(), m[2].trim()]);
  }
  return pairs;
}

function mergeParsed(target: ParsedProgramPageFields, patch: ParsedProgramPageFields): ParsedProgramPageFields {
  const next: ParsedProgramPageFields = { ...target, metadata: { ...(target.metadata ?? {}) } };
  for (const [k, v] of Object.entries(patch)) {
    if (k === "metadata") {
      next.metadata = { ...(next.metadata ?? {}), ...(v as Record<string, unknown>) };
      continue;
    }
    if (v == null || v === "") continue;
    if (k === "intake_months" && Array.isArray(v)) {
      next.intake_months = v;
      continue;
    }
    (next as Record<string, unknown>)[k] = v;
  }
  return next;
}

/** Parse explicit structured fields from raw HTML. */
export function parseProgramPageHtml(html: string, _pageUrl?: string): ParsedProgramPageFields {
  let out: ParsedProgramPageFields = { metadata: {} };

  for (const obj of extractJsonLdObjects(html)) mergeJsonLd(out, obj);

  const pairs = [
    ...extractDefinitionListPairs(html),
    ...extractTablePairs(html),
    ...extractListLabelBlocks(html),
  ];
  for (const [label, value] of pairs) {
    const patch: ParsedProgramPageFields = { metadata: {} };
    applyLabelValue(label, value, patch);
    out = mergeParsed(out, patch);
  }

  if (out.metadata && !Object.keys(out.metadata).length) delete out.metadata;
  return out;
}

function hiddenValue(html: string, id: string): string | null {
  const re = new RegExp(`<input[^>]+id=["']${id}["'][^>]+value=["']([^"']+)["']`, "i");
  const alt = new RegExp(`<input[^>]+value=["']([^"']+)["'][^>]+id=["']${id}["']`, "i");
  return html.match(re)?.[1] ?? html.match(alt)?.[1] ?? null;
}

function normalizeUrlPath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.replace(/\/$/, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/** Map Algolia program hit fields when present — structured API response only. */
export function parseAlgoliaProgramHit(hit: Record<string, unknown>): ParsedProgramPageFields {
  const out: ParsedProgramPageFields = { metadata: { import_source: "algolia_program_api" } };

  const campus = hit.Campus ?? hit.CampusName ?? hit.campus ?? hit.campuses;
  if (campus) {
    out.campus_name = Array.isArray(campus) ? campus.map(String).join(", ") : String(campus).trim();
  }

  const duration = hit.ProgramLength ?? hit.Duration ?? hit.program_length ?? hit.duration;
  const d = parseDuration(duration);
  if (d) {
    out.duration_value = d.value;
    out.duration_unit = d.unit;
  }

  const ielts = hit.IELTSOverall ?? hit.IELTS ?? hit.ielts_overall ?? hit.MinimumIELTS;
  const ieltsN = parseNumber(ielts);
  if (ieltsN != null) out.ielts_overall = ieltsN;

  const ieltsMin = hit.IELTSMinBand ?? hit.IELTSMinimum ?? hit.ielts_min ?? hit.IELTSMin;
  const ieltsMinN = parseNumber(ieltsMin);
  if (ieltsMinN != null) out.ielts_min_component = ieltsMinN;

  const pte = hit.PTE ?? hit.PTEScore ?? hit.pte_overall;
  const pteN = parseNumber(pte);
  if (pteN != null) out.pte_overall = pteN;

  const toefl = hit.TOEFL ?? hit.TOEFLScore ?? hit.toefl_overall;
  const toeflN = parseNumber(toefl);
  if (toeflN != null) out.toefl_overall = toeflN;

  const duo = hit.Duolingo ?? hit.DuolingoScore ?? hit.duolingo_overall;
  const duoN = parseNumber(duo);
  if (duoN != null) out.duolingo_overall = duoN;

  const tuition = hit.Tuition ?? hit.TuitionFee ?? hit.InternationalTuition ?? hit.tuition_fee;
  const tuitionN = parseNumber(tuition);
  if (tuitionN != null) out.tuition_fee = tuitionN;

  const appFee = hit.ApplicationFee ?? hit.application_fee;
  const appFeeN = parseNumber(appFee);
  if (appFeeN != null) out.application_fee = appFeeN;

  const intakes = hit.StartDates ?? hit.Intakes ?? hit.intake_months ?? hit.IntakeMonths;
  const intakeList = parseIntakes(intakes);
  if (intakeList) out.intake_months = intakeList;

  const coop = hit.CoOp ?? hit.Coop ?? hit.is_coop;
  const coopB = parseBool(coop);
  if (coopB != null) out.is_coop = coopB;

  const pgwp = hit.PGWP ?? hit.PGWPEligible ?? hit.is_pgwp_eligible;
  const pgwpB = parseBool(pgwp);
  if (pgwpB != null) out.is_pgwp_eligible = pgwpB;

  const delivery = hit.ProgramType ?? hit.DeliveryMode ?? hit.program_delivery_mode;
  if (delivery) {
    out.metadata = {
      ...(out.metadata ?? {}),
      program_delivery_mode: String(delivery).trim(),
    };
  }

  const credential = hit.Credential ?? hit.ProgramLevel ?? hit.program_level;
  if (credential) {
    out.metadata = {
      ...(out.metadata ?? {}),
      program_level: String(credential).trim(),
    };
  }

  if (out.metadata && Object.keys(out.metadata).length <= 1 && out.metadata.import_source) {
    delete out.metadata.import_source;
    if (!Object.keys(out.metadata ?? {}).length) delete out.metadata;
  }

  return out;
}

/** Fetch Algolia program record matching program URL (deterministic API lookup). */
export async function fetchAlgoliaProgramByUrl(
  pageUrl: string,
  html: string,
): Promise<ParsedProgramPageFields | null> {
  const appId = hiddenValue(html, "Algolia_AppId");
  const apiKey = hiddenValue(html, "Algolia_ApiKey");
  const index = hiddenValue(html, "Algolia_Idx_Programs_Relevance");
  if (!appId || !apiKey || !index) return null;

  const targetPath = normalizeUrlPath(pageUrl);
  const params = new URLSearchParams();
  params.set("hitsPerPage", "20");
  params.set("page", "0");

  const r = await fetch(`https://${appId}-dsn.algolia.net/1/indexes/${encodeURIComponent(index)}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Algolia-Application-Id": appId,
      "X-Algolia-API-Key": apiKey,
      Origin: new URL(pageUrl).origin,
      Referer: pageUrl,
    },
    body: JSON.stringify({ params: params.toString() }),
  });
  if (!r.ok) return null;
  const data = await r.json().catch(() => null);
  const hits = Array.isArray(data?.hits) ? data.hits : [];
  const hit = hits.find((h: Record<string, unknown>) => {
    const url = String(h.ProgramURL ?? h.url ?? h.program_url ?? "").trim();
    if (!url) return false;
    try {
      return normalizeUrlPath(url) === targetPath || normalizeUrlPath(url).endsWith(targetPath.split("/").pop() ?? "");
    } catch {
      return false;
    }
  }) as Record<string, unknown> | undefined;

  return hit ? parseAlgoliaProgramHit(hit) : null;
}

export async function parseProgramPageFromUrl(
  pageUrl: string,
  html: string,
): Promise<ParsedProgramPageFields> {
  let out = parseProgramPageHtml(html, pageUrl);
  try {
    const algolia = await fetchAlgoliaProgramByUrl(pageUrl, html);
    if (algolia) out = mergeParsed(out, algolia);
  } catch {
    /* Algolia optional */
  }
  return out;
}
