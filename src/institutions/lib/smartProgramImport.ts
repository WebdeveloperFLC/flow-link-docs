import {
  computeCourseDedupHashFromInputs,
  courseDedupInputs,
  resolveCourseDedupLevel,
} from "./courseDedup";
import { mapProgramSheetRow, parseProgramSheetFile } from "./programSheetImport";

export type SmartImportMethod = "paste" | "xlsx" | "csv" | "tsv";

export type SmartProgramRecord = {
  rowIndex: number;
  programName: string;
  programCode: string | null;
  credential: string | null;
  intakes: string[];
  programUrl: string | null;
  status: string | null;
};

export type SmartProgramUpsertPayload = NonNullable<ReturnType<typeof mapProgramSheetRow>>;

export type ExistingProgramRow = {
  id: string;
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

const HEADER_ALIASES: Record<string, keyof Omit<SmartProgramRecord, "rowIndex">> = {
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
  if (code) return { programName: trimmed, programCode: code };

  const match = trimmed.match(/\(([A-Z]{2,8})\)\s*$/);
  if (match) {
    return {
      programName: trimmed.replace(/\s*\([A-Z]{2,8}\)\s*$/, "").trim(),
      programCode: match[1],
    };
  }
  return { programName: trimmed, programCode: null };
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

export function parseSmartImportFile(buffer: ArrayBuffer, method: Exclude<SmartImportMethod, "paste">): Record<string, unknown>[] {
  if (method === "xlsx") return parseProgramSheetFile(buffer);
  const text = new TextDecoder("utf-8").decode(buffer);
  return parseDelimitedText(text, method === "tsv" ? "\t" : ",");
}

function mapFieldFromRow(
  row: Record<string, unknown>,
  field: keyof Omit<SmartProgramRecord, "rowIndex">,
): unknown {
  for (const [header, value] of Object.entries(row)) {
    const alias = HEADER_ALIASES[normalizeHeader(header)];
    if (alias === field) return value;
  }
  return undefined;
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

  const programUrl = String(
    mapFieldFromRow(row, "programUrl") ??
      row["Program URL"] ??
      partnerMapped?.program_url ??
      "",
  ).trim() || null;

  const status = String(mapFieldFromRow(row, "status") ?? "").trim() || null;

  return {
    rowIndex,
    programName,
    programCode,
    credential,
    intakes,
    programUrl,
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
export function buildSmartImportPayload(record: SmartProgramRecord): SmartProgramUpsertPayload | null {
  if (!record.programName.trim()) return null;
  if (record.programUrl && !isValidHttpUrl(record.programUrl)) return null;

  const partnerRow = mapProgramSheetRow({
    Name: record.programName,
    "Program Level": record.credential ?? "",
    "Program Code": record.programCode ?? "",
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
    metadata: {
      ...partnerRow.metadata,
      program_code: record.programCode,
      program_level: record.credential,
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
  const existingCode = String(meta.program_code ?? "").trim() || null;
  const existingCredential = resolveCourseDedupLevel(meta, levelName);
  const existingUrl = String(existing.program_url ?? "").trim() || null;

  if (record.programCode !== existingCode) changes.push("Program Code");
  if ((record.credential ?? "") !== (existingCredential ?? "")) changes.push("Credential");
  if (intakeKey(record.intakes) !== intakeKey(existingIntakes(existing))) changes.push("Intakes");
  if ((record.programUrl ?? "") !== (existingUrl ?? "")) changes.push("Official Program URL");
  if (record.status && record.status !== String(existing.review_status ?? "")) changes.push("Status");
  return changes;
}

export async function compareSmartImportRecords(
  records: SmartProgramRecord[],
  institutionId: string,
  existingRows: ExistingProgramRow[],
  resolveLevelName: (programLevelId: string | null | undefined) => string | null,
): Promise<ProgramCompareSummary> {
  const summary: ProgramCompareSummary = { new: [], updated: [], unchanged: [], errors: [] };
  const byHash = new Map<string, ExistingProgramRow>();

  for (const row of existingRows) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const inputs = courseDedupInputs(row, meta, resolveLevelName(row.program_level_id));
    const hash = await computeCourseDedupHashFromInputs(inputs);
    byHash.set(hash, row);
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

    const payload = buildSmartImportPayload(record);
    if (!payload) {
      summary.errors.push({ kind: "error", record, error: "Could not build import row" });
      continue;
    }

    const hash = await computeCourseDedupHashFromInputs({
      institution_id: institutionId,
      course_title: payload.course_title,
      program_level_id: null,
      program_level: payload.metadata?.program_level as string | undefined,
    });

    const existing = byHash.get(hash);
    if (!existing) {
      summary.new.push({ kind: "new", record, payload });
      continue;
    }

    const changes = diffMvpFields(record, existing, resolveLevelName(existing.program_level_id));
    if (changes.length === 0) {
      summary.unchanged.push({ kind: "unchanged", record, existing });
    } else {
      summary.updated.push({ kind: "updated", record, payload, existing, changes });
    }
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
