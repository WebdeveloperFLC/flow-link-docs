import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

export interface CsvRow {
  first_name?: string; last_name?: string; full_name?: string;
  phone?: string; email?: string; country?: string;
  service?: string; academics?: string; ielts?: string;
  status?: string; assigned_telecaller?: string; assigned_counselor?: string;
  notes?: string; campaign?: string;
}

export interface PreviewRow extends CsvRow {
  _row: number;
  _errors: string[];
  _duplicate: boolean;
}

export type DedupeAction = "skip" | "update" | "merge";

export interface ImportResult {
  total: number; created: number; updated: number; skipped: number; failed: number;
  errors: { row: number; error: string }[];
}

const ALIASES: Record<string, keyof CsvRow> = {
  "first name": "first_name", "firstname": "first_name", "fname": "first_name",
  "last name": "last_name", "lastname": "last_name", "lname": "last_name",
  "full name": "full_name", "name": "full_name",
  "phone": "phone", "mobile": "phone", "contact": "phone", "phone number": "phone",
  "email": "email", "email address": "email",
  "country": "country", "country interested": "country",
  "service": "service", "service interested": "service", "course": "service",
  "academics": "academics", "education": "academics", "qualification": "academics",
  "ielts": "ielts", "ielts/pte": "ielts", "ielts score": "ielts", "pte": "ielts",
  "status": "status", "lead status": "status", "hot/warm/cold": "status",
  "assigned counselor": "assigned_counselor", "counselor": "assigned_counselor", "counselor email": "assigned_counselor",
  "assigned telecaller": "assigned_telecaller", "telecaller": "assigned_telecaller", "telecaller email": "assigned_telecaller",
  "notes": "notes", "remark": "notes", "remarks": "notes", "comment": "notes",
  "campaign": "campaign",
};

function normalize(row: Record<string, string>): CsvRow {
  const out: CsvRow = {};
  for (const [k, v] of Object.entries(row)) {
    const key = ALIASES[k.toLowerCase().trim()];
    if (key && v !== undefined && v !== null) (out as Record<string, string>)[key] = String(v).trim();
  }
  if (!out.full_name && (out.first_name || out.last_name)) {
    out.full_name = `${out.first_name ?? ""} ${out.last_name ?? ""}`.trim();
  }
  return out;
}

export async function parseCsv(file: File): Promise<PreviewRow[]> {
  const isXlsx = /\.(xlsx|xls)$/i.test(file.name);
  let raw: Record<string, string>[];
  if (isXlsx) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" })
      .map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? "")])));
  } else {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    raw = parsed.data;
  }
  const rows = raw.map(normalize);

  // Duplicate detection in DB
  const phones = rows.map((r) => r.phone?.replace(/\s+/g, "") || "").filter(Boolean);
  const emails = rows.map((r) => r.email?.toLowerCase() || "").filter(Boolean);
  const dupSet = new Set<string>();
  if (phones.length || emails.length) {
    const { data: existing } = await supabase
      .from("clients").select("phone,email")
      .or([
        phones.length ? `phone.in.(${phones.map((p) => `"${p}"`).join(",")})` : "",
        emails.length ? `email.in.(${emails.map((e) => `"${e}"`).join(",")})` : "",
      ].filter(Boolean).join(","));
    for (const r of existing ?? []) {
      if (r.phone) dupSet.add(`p:${r.phone}`);
      if (r.email) dupSet.add(`e:${r.email.toLowerCase()}`);
    }
  }
  // In-CSV dedupe
  const seen = new Set<string>();
  return rows.map((r, idx): PreviewRow => {
    const errors: string[] = [];
    if (!r.full_name) errors.push("missing name");
    if (!r.phone || r.phone.length < 6) errors.push("missing/invalid phone");
    const key = `p:${r.phone}`;
    let duplicate = false;
    if (r.phone && (dupSet.has(key) || seen.has(key))) duplicate = true;
    if (r.email && dupSet.has(`e:${r.email.toLowerCase()}`)) duplicate = true;
    if (r.phone) seen.add(key);
    return { ...r, _row: idx + 2, _errors: errors, _duplicate: duplicate };
  });
}

function normalizeStatus(s: string | undefined): string {
  const v = (s ?? "").toLowerCase().trim();
  if (["hot", "h"].includes(v)) return "hot";
  if (["cold", "c"].includes(v)) return "cold";
  if (["not interested", "ni", "dnd"].includes(v)) return "not_interested";
  if (["converted", "won"].includes(v)) return "converted";
  return "warm";
}

export async function importRows(rows: PreviewRow[], action: DedupeAction, campaignId?: string | null): Promise<ImportResult> {
  const result: ImportResult = { total: rows.length, created: 0, updated: 0, skipped: 0, failed: 0, errors: [] };
  for (const row of rows) {
    if (row._errors.length) { result.failed++; result.errors.push({ row: row._row, error: row._errors.join(", ") }); continue; }
    try {
      const { data, error } = await supabase.rpc("import_lead", {
        _full_name: row.full_name!, _phone: row.phone!, _email: row.email || null,
        _country: row.country || "India", _service: row.service || "Student Visa (SDS)",
        _academics: row.academics || null, _ielts: row.ielts || null,
        _lead_status: normalizeStatus(row.status),
        _assigned_telecaller_email: row.assigned_telecaller || null,
        _assigned_counselor_email: row.assigned_counselor || null,
        _campaign_id: campaignId || null,
        _notes: row.notes || null,
        _dedupe_action: action,
      });
      if (error) throw error;
      const status = (data as { status?: string } | null)?.status;
      if (status === "created") result.created++;
      else if (status === "updated") result.updated++;
      else result.skipped++;
    } catch (e) {
      result.failed++;
      result.errors.push({ row: row._row, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return result;
}