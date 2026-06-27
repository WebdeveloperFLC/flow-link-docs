import * as XLSX from "xlsx";
import {
  canonicalCourseTitle,
  resolveCourseDedupLevel,
} from "./courseDedup";
import { mapProgramSheetRow } from "./programSheetImport";

export type SmartImportMethod = "paste" | "xlsx" | "csv" | "tsv";

export const HYPERLINK_PREFIX = "__hyperlink__";

export type SmartProgramRecord = {
  rowIndex: number;
  programName: string;
  programCode: string | null;
  credential: string | null;
  intakes: string[];
  programUrl: string | null;
  urlDetected: boolean;
  status: string | null;
};

export type SmartProgramUpsertPayload = NonNullable<ReturnType<typeof mapProgramSheetRow>> & {
  _staging_id?: string;
};

export type ExistingProgramRow = {
  id: string;
  institution_id?: string | null;
  course_title: string | null;
  program_url?: string | null;
  program_level_id?: string | null;
  intake_months?: unknown;
  review_status?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ProgramCompareItem =
  | { kind: "new"; record: SmartProgramRecord; payload: SmartProgramUpsertPayload }
  | {
      kind: "updated";
      record: SmartProgramRecord;
      payload: SmartProgramUpsertPayload;
      existing: ExistingProgramRow;
      changes: string[];
    }
  | { kind: "unchanged"; record: SmartProgramRecord; existing: ExistingProgramRow }
  | { kind: "error"; record: SmartProgramRecord; error: string };

export type ProgramCompareSummary = {
  new: ProgramCompareItem[];
  updated: ProgramCompareItem[];
  unchanged: ProgramCompareItem[];
  errors: ProgramCompareItem[];
};

const HEADER_ALIASES: Record<string, keyof Omit<SmartProgramRecord, "rowIndex" | "urlDetected">> = {
  name: "programName",
  "program name": "programName",
  course_title: "programName",
  title: "programName",
  program: "programName",
  "program code": "programCode",
  code: "programCode",
  credential: "credential",
  "program level": "credential",
  level: "credential",
  degree: "credential",
  qualification: "credential",
  intakes: "intakes",
  intake: "intakes",
  "course intake": "intakes",
  "start dates": "intakes",
  "program url": "programUrl",
  url: "programUrl",
  link: "programUrl",
  "official program url": "programUrl",
  "official url": "programUrl",
  status: "status",
  "review status": "status",
};

function normalizeHeader(h: string): string {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function splitIntakes(raw: unknown): string[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  return text.split(/[,;/|]+/).map((s) => s.trim()).filter(Boolean);
}

/** Extract program code from trailing brackets, e.g. "Artificial Intelligence (AIG)". */
export function extractProgramCodeFromTitle(
  title: string,
  explicitCode?: string | null,
): { programName: string; programCode: string | null } {
  const trimmed = String(title ?? "").trim();
  if (!trimmed) return { programName: "", programCode: null };

  const code = String(explicitCode ?? "").trim();
  if (code) return { programName: trimmed, programCode: code.toUpperCase() };

  const match = trimmed.match(/\(([A-Z]{2,8})\)\s*$/);
  if (match) {
    return {
      programName: trimmed.replace(/\s*\([A-Z]{2,8}\)\s*$/, "").trim(),
      programCode: match[1],
    };
  }
  return { programName: trimmed, programCode: null };
}

export function normalizeProgramCode(code: string | null | undefined): string | null {
  const c = String(code ?? "").trim().toUpperCase();
  return c || null;
}

export function normalizeProgramNameForMatch(name: string): string {
  return canonicalCourseTitle(String(name ?? "").trim(), "");
}

export function normalizeCredentialForMatch(credential: string | null | undefined): string {
  return String(credential ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Match key: institution + program_code (preferred) or institution + normalized name + credential. */
export function buildSmartImportMatchKey(
  institutionId: string,
  record: Pick<SmartProgramRecord, "programName" | "programCode" | "credential">,
): string {
  const code = normalizeProgramCode(record.programCode);
  if (code) return `${institutionId}::code::${code}`;
  const name = normalizeProgramNameForMatch(record.programName);
  const cred = normalizeCredentialForMatch(record.credential);
  return `${institutionId}::name::${name}::${cred}`;
}

export function buildExistingProgramMatchKey(
  institutionId: string,
  row: ExistingProgramRow,
  resolveLevelName: (programLevelId: string | null | undefined) => string | null,
): string {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  const code = normalizeProgramCode(String(meta.program_code ?? ""));
  if (code) return `${institutionId}::code::${code}`;
  const name = normalizeProgramNameForMatch(String(row.course_title ?? ""));
  const cred = normalizeCredentialForMatch(
    resolveCourseDedupLevel(meta, resolveLevelName(row.program_level_id)),
  );
  return `${institutionId}::name::${name}::${cred}`;
}

function isValidHttpUrl(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return true;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function detectDelimiter(line: string): "\t" | "," | ";" {
  const tabs = (line.match(/\t/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  const semis = (line.match(/;/g) ?? []).length;
  if (tabs >= commas && tabs >= semis && tabs > 0) return "\t";
  if (semis > commas && semis > 0) return ";";
  return ",";
}

export function parseDelimitedText(text: string, forcedDelimiter?: "\t" | "," | ";"): Record<string, unknown>[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = forcedDelimiter ?? detectDelimiter(lines[0]);
  const splitLine = (line: string): string[] => {
    if (delimiter === "\t") return line.split("\t");
    const parts: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (!inQuotes && ch === delimiter) {
        parts.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    parts.push(cur.trim());
    return parts.map((p) => p.replace(/^"|"$/g, "").trim());
  };

  const headers = splitLine(lines[0]);
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

/** Parse Excel with embedded cell hyperlinks exposed as __hyperlink__{column} keys. */
export function parseSmartImportExcel(buffer: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const ref = sheet?.["!ref"];
  if (!ref) return [];

  const range = XLSX.utils.decode_range(ref);
  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
    headers.push(String(cell?.v ?? `Column${c + 1}`).trim());
  }

  const rows: Record<string, unknown>[] = [];
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const row: Record<string, unknown> = {};
    let hasData = false;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const header = headers[c - range.s.c];
      if (!header) continue;
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      const value = cell?.v ?? "";
      if (String(value).trim()) hasData = true;
      row[header] = value;
      const linkObj = cell?.l as { Target?: string; target?: string } | undefined;
      const linkTarget = linkObj?.Target ?? linkObj?.target;
      if (linkTarget && typeof linkTarget === "string" && linkTarget.trim()) {
        row[`${HYPERLINK_PREFIX}${header}`] = linkTarget.trim();
      }
    }
    if (hasData) rows.push(row);
  }
  return rows;
}

export function parseSmartImportFile(buffer: ArrayBuffer, method: Exclude<SmartImportMethod, "paste">): Record<string, unknown>[] {
  if (method === "xlsx") return parseSmartImportExcel(buffer);
  const text = new TextDecoder("utf-8").decode(buffer);
  return parseDelimitedText(text, method === "tsv" ? "\t" : ",");
}

function mapFieldFromRow(
  row: Record<string, unknown>,
  field: keyof Omit<SmartProgramRecord, "rowIndex" | "urlDetected">,
): unknown {
  for (const [header, value] of Object.entries(row)) {
    if (header.startsWith(HYPERLINK_PREFIX)) continue;
    const alias = HEADER_ALIASES[normalizeHeader(header)];
    if (alias === field) return value;
  }
  return undefined;
}

function resolveProgramUrl(
  row: Record<string, unknown>,
  partnerMapped: ReturnType<typeof mapProgramSheetRow>,
): { programUrl: string | null; urlDetected: boolean } {
  const fromColumn = String(
    mapFieldFromRow(row, "programUrl") ??
      row["Program URL"] ??
      partnerMapped?.program_url ??
      "",
  ).trim();

  if (fromColumn) {
    return { programUrl: fromColumn, urlDetected: true };
  }

  const hyperlinkEntries = Object.entries(row).filter(([k]) => k.startsWith(HYPERLINK_PREFIX));

  for (const [k, v] of hyperlinkEntries) {
    const header = k.slice(HYPERLINK_PREFIX.length);
    const alias = HEADER_ALIASES[normalizeHeader(header)];
    const url = String(v).trim();
    if (alias === "programUrl" && url) return { programUrl: url, urlDetected: true };
  }

  for (const [k, v] of hyperlinkEntries) {
    const header = k.slice(HYPERLINK_PREFIX.length);
    const alias = HEADER_ALIASES[normalizeHeader(header)];
    const url = String(v).trim();
    if (alias === "programName" && url.startsWith("http")) return { programUrl: url, urlDetected: true };
  }

  for (const [, v] of hyperlinkEntries) {
    const url = String(v).trim();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return { programUrl: url, urlDetected: true };
    }
  }

  return { programUrl: null, urlDetected: false };
}

/** Map a parsed row to MVP smart-import fields with column auto-detection. */
export function mapSmartProgramRecord(row: Record<string, unknown>, rowIndex: number): SmartProgramRecord | null {
  const partnerMapped = mapProgramSheetRow(row);
  const rawTitle = String(
    mapFieldFromRow(row, "programName") ??
      row.Name ??
      row["Program Name"] ??
      row.course_title ??
      partnerMapped?.course_title ??
      "",
  ).trim();
  if (!rawTitle) return null;

  const explicitCode = String(mapFieldFromRow(row, "programCode") ?? partnerMapped?.metadata?.program_code ?? "").trim();
  const { programName, programCode } = extractProgramCodeFromTitle(rawTitle, explicitCode || null);

  const credential = String(
    mapFieldFromRow(row, "credential") ??
      row["Program Level"] ??
      partnerMapped?.metadata?.program_level ??
      "",
  ).trim() || null;

  const intakesRaw = mapFieldFromRow(row, "intakes") ?? row["Course Intake"] ?? partnerMapped?.intake_months;
  const intakes = Array.isArray(intakesRaw)
    ? intakesRaw.map(String).filter(Boolean)
    : splitIntakes(intakesRaw);

  const { programUrl, urlDetected } = resolveProgramUrl(row, partnerMapped);
  const status = String(mapFieldFromRow(row, "status") ?? "").trim() || null;

  return {
    rowIndex,
    programName,
    programCode,
    credential,
    intakes,
    programUrl,
    urlDetected,
    status,
  };
}

export function mapSmartProgramRecords(rows: Record<string, unknown>[]): SmartProgramRecord[] {
  const out: SmartProgramRecord[] = [];
  rows.forEach((row, idx) => {
    const mapped = mapSmartProgramRecord(row, idx + 1);
    if (mapped) out.push(mapped);
  });
  return out;
}

/** Build minimal upi-upsert-courses payload — structured import, no AI / knowledge sources. */
export function buildSmartImportPayload(
  record: SmartProgramRecord,
  stagingId?: string,
): SmartProgramUpsertPayload | null {
  if (!record.programName.trim()) return null;
  if (record.programUrl && !isValidHttpUrl(record.programUrl)) return null;

  const normalizedCode = normalizeProgramCode(record.programCode);

  const partnerRow = mapProgramSheetRow({
    Name: record.programName,
    "Program Level": record.credential ?? "",
    "Program Code": normalizedCode ?? "",
    "Course Intake": record.intakes.join(", "),
    "Program URL": record.programUrl ?? "",
    Status: record.status ?? "",
  });
  if (!partnerRow) return null;

  return {
    ...partnerRow,
    course_title: record.programName,
    program_url: record.programUrl,
    source_url: record.programUrl,
    intake_months: record.intakes,
    confidence_score: 100,
    ...(stagingId ? { _staging_id: stagingId } : {}),
    metadata: {
      ...partnerRow.metadata,
      program_code: normalizedCode,
      program_level: record.credential,
      official_program_url: record.programUrl,
      import_source: "smart_program_import",
      import_status: record.status,
    },
  };
}

function intakeKey(intakes: string[] | unknown): string {
  const list = Array.isArray(intakes) ? intakes.map(String) : splitIntakes(intakes);
  return [...list].sort((a, b) => a.localeCompare(b)).join("|").toLowerCase();
}

function existingIntakes(row: ExistingProgramRow): string[] {
  if (Array.isArray(row.intake_months)) return row.intake_months.map(String);
  return splitIntakes(row.intake_months);
}

function diffMvpFields(
  record: SmartProgramRecord,
  existing: ExistingProgramRow,
  levelName?: string | null,
): string[] {
  const changes: string[] = [];
  const meta = (existing.metadata ?? {}) as Record<string, unknown>;
  const existingCode = normalizeProgramCode(String(meta.program_code ?? ""));
  const existingCredential = resolveCourseDedupLevel(meta, levelName);
  const existingUrl = String(existing.program_url ?? meta.official_program_url ?? "").trim() || null;
  const existingName = normalizeProgramNameForMatch(String(existing.course_title ?? ""));

  if (normalizeProgramCode(record.programCode) !== existingCode) changes.push("Program Code");
  if (normalizeProgramNameForMatch(record.programName) !== existingName) changes.push("Program Name");
  if (normalizeCredentialForMatch(record.credential) !== normalizeCredentialForMatch(existingCredential)) {
    changes.push("Credential");
  }
  if (intakeKey(record.intakes) !== intakeKey(existingIntakes(existing))) changes.push("Intakes");
  if ((record.programUrl ?? "") !== (existingUrl ?? "")) changes.push("Official Program URL");
  if (record.status && record.status !== String(existing.review_status ?? "")) changes.push("Status");
  return changes;
}

export function compareSmartImportRecords(
  records: SmartProgramRecord[],
  institutionId: string,
  existingRows: ExistingProgramRow[],
  resolveLevelName: (programLevelId: string | null | undefined) => string | null,
): ProgramCompareSummary {
  const summary: ProgramCompareSummary = { new: [], updated: [], unchanged: [], errors: [] };
  const byMatchKey = new Map<string, ExistingProgramRow>();
  const seenImportKeys = new Set<string>();

  for (const row of existingRows) {
    const instId = row.institution_id ?? institutionId;
    const key = buildExistingProgramMatchKey(instId, row, resolveLevelName);
    if (!byMatchKey.has(key)) byMatchKey.set(key, row);
  }

  for (const record of records) {
    if (!record.programName.trim()) {
      summary.errors.push({ kind: "error", record, error: "Program Name is required" });
      continue;
    }
    if (record.programUrl && !isValidHttpUrl(record.programUrl)) {
      summary.errors.push({ kind: "error", record, error: "Invalid Official Program URL" });
      continue;
    }

    const matchKey = buildSmartImportMatchKey(institutionId, record);
    if (seenImportKeys.has(matchKey)) {
      summary.errors.push({ kind: "error", record, error: "Duplicate program in import file" });
      continue;
    }
    seenImportKeys.add(matchKey);

    const existing = byMatchKey.get(matchKey);
    if (!existing) {
      const payload = buildSmartImportPayload(record);
      if (!payload) {
        summary.errors.push({ kind: "error", record, error: "Could not build import row" });
        continue;
      }
      summary.new.push({ kind: "new", record, payload });
      continue;
    }

    const changes = diffMvpFields(record, existing, resolveLevelName(existing.program_level_id));
    if (changes.length === 0) {
      summary.unchanged.push({ kind: "unchanged", record, existing });
      continue;
    }

    const payload = buildSmartImportPayload(record, existing.id);
    if (!payload) {
      summary.errors.push({ kind: "error", record, error: "Could not build import row" });
      continue;
    }
    summary.updated.push({ kind: "updated", record, payload, existing, changes });
  }

  return summary;
}

export function formatCompareCounts(summary: ProgramCompareSummary) {
  return {
    new: summary.new.length,
    updated: summary.updated.length,
    unchanged: summary.unchanged.length,
    errors: summary.errors.length,
    total: summary.new.length + summary.updated.length + summary.unchanged.length + summary.errors.length,
  };
}
