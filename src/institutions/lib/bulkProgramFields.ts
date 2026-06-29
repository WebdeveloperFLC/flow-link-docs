import type { UpiCourseStaging } from "../types/upi";

export type BulkApplyMode = "empty_only" | "overwrite";

export type ProgramBulkFieldId =
  | "ielts_overall"
  | "ielts_min_component"
  | "pte_overall"
  | "toefl_overall"
  | "duolingo_overall"
  | "moi_accepted"
  | "application_fee"
  | "required_deposit"
  | "processing_time"
  | "backlogs_allowed";

type FieldKind = "column" | "metadata";
type FieldType = "number" | "boolean" | "string";

export type ProgramBulkFieldDef = {
  id: ProgramBulkFieldId;
  label: string;
  kind: FieldKind;
  column?: keyof UpiCourseStaging;
  metaKey?: string;
  type: FieldType;
};

export const ENGLISH_BULK_FIELDS: ProgramBulkFieldDef[] = [
  { id: "ielts_overall", label: "IELTS Overall", kind: "column", column: "ielts_overall", type: "number" },
  {
    id: "ielts_min_component",
    label: "IELTS Minimum Band",
    kind: "column",
    column: "ielts_min_component",
    type: "number",
  },
  { id: "pte_overall", label: "PTE", kind: "column", column: "pte_overall", type: "number" },
  { id: "toefl_overall", label: "TOEFL", kind: "column", column: "toefl_overall", type: "number" },
  { id: "duolingo_overall", label: "Duolingo", kind: "column", column: "duolingo_overall", type: "number" },
  { id: "moi_accepted", label: "MOI Accepted", kind: "metadata", metaKey: "moi_accepted", type: "boolean" },
];

export const COPY_FROM_PROGRAM_FIELDS: ProgramBulkFieldDef[] = [
  ...ENGLISH_BULK_FIELDS,
  { id: "application_fee", label: "Application Fee", kind: "column", column: "application_fee", type: "number" },
  { id: "required_deposit", label: "Deposit", kind: "metadata", metaKey: "required_deposit", type: "number" },
  { id: "processing_time", label: "Processing Time", kind: "metadata", metaKey: "processing_time", type: "string" },
  { id: "backlogs_allowed", label: "Backlog Policy", kind: "metadata", metaKey: "backlogs_allowed", type: "string" },
];

const FIELD_BY_ID = new Map(COPY_FROM_PROGRAM_FIELDS.map((f) => [f.id, f]));

export function getBulkFieldDef(id: ProgramBulkFieldId): ProgramBulkFieldDef {
  const def = FIELD_BY_ID.get(id);
  if (!def) throw new Error(`Unknown bulk field: ${id}`);
  return def;
}

function metaRecord(row: UpiCourseStaging): Record<string, unknown> {
  return (row.metadata as Record<string, unknown> | null) ?? {};
}

export function isBulkFieldEmpty(row: UpiCourseStaging, fieldId: ProgramBulkFieldId): boolean {
  const def = getBulkFieldDef(fieldId);
  const value = readBulkFieldValue(row, def);
  if (value == null) return true;
  if (def.type === "string") return String(value).trim() === "";
  return false;
}

export function readBulkFieldValue(row: UpiCourseStaging, def: ProgramBulkFieldDef): unknown {
  if (def.kind === "column" && def.column) {
    return row[def.column];
  }
  if (def.metaKey) {
    const raw = metaRecord(row)[def.metaKey];
    if (raw === undefined) {
      const alt = metaRecord(row)[def.label];
      if (alt !== undefined) return alt;
    }
    return raw;
  }
  return null;
}

export function readBulkFieldValues(
  row: UpiCourseStaging,
  fieldIds: ProgramBulkFieldId[],
): Partial<Record<ProgramBulkFieldId, unknown>> {
  const out: Partial<Record<ProgramBulkFieldId, unknown>> = {};
  for (const id of fieldIds) {
    const def = getBulkFieldDef(id);
    const value = readBulkFieldValue(row, def);
    if (!isValueEmpty(value, def.type)) out[id] = value;
  }
  return out;
}

function isValueEmpty(value: unknown, type: FieldType): boolean {
  if (value == null) return true;
  if (type === "string") return String(value).trim() === "";
  return false;
}

function modeValue<T>(values: T[]): T | undefined {
  if (!values.length) return undefined;
  const counts = new Map<string, { value: T; count: number }>();
  for (const value of values) {
    const key = JSON.stringify(value);
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { value, count: 1 });
  }
  let best: { value: T; count: number } | undefined;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  return best?.value;
}

/** Most common non-empty values for programs at an institution (database lookup only). */
export function detectInstitutionFieldValues(
  institutionId: string,
  allRows: UpiCourseStaging[],
  fieldIds: ProgramBulkFieldId[],
): Partial<Record<ProgramBulkFieldId, unknown>> {
  const instRows = allRows.filter((r) => r.institution_id === institutionId);
  const detected: Partial<Record<ProgramBulkFieldId, unknown>> = {};

  for (const fieldId of fieldIds) {
    const def = getBulkFieldDef(fieldId);
    const samples = instRows
      .map((row) => readBulkFieldValue(row, def))
      .filter((value) => !isValueEmpty(value, def.type));
    const mode = modeValue(samples);
    if (mode !== undefined) detected[fieldId] = mode;
  }

  return detected;
}

export function formatBulkFieldValue(def: ProgramBulkFieldDef, value: unknown): string {
  if (value == null) return "—";
  if (def.type === "boolean") return value === true || value === "true" ? "Yes" : "No";
  return String(value);
}

export function parseBulkNumberInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export type EnglishRequirementsForm = {
  ielts_overall: string;
  ielts_min_component: string;
  pte_overall: string;
  toefl_overall: string;
  duolingo_overall: string;
  moi_accepted: "" | "yes" | "no";
};

export const EMPTY_ENGLISH_FORM: EnglishRequirementsForm = {
  ielts_overall: "",
  ielts_min_component: "",
  pte_overall: "",
  toefl_overall: "",
  duolingo_overall: "",
  moi_accepted: "",
};

export function englishFormToValues(form: EnglishRequirementsForm): Partial<Record<ProgramBulkFieldId, unknown>> {
  const values: Partial<Record<ProgramBulkFieldId, unknown>> = {};
  const ielts = parseBulkNumberInput(form.ielts_overall);
  if (ielts != null) values.ielts_overall = ielts;
  const ieltsMin = parseBulkNumberInput(form.ielts_min_component);
  if (ieltsMin != null) values.ielts_min_component = ieltsMin;
  const pte = parseBulkNumberInput(form.pte_overall);
  if (pte != null) values.pte_overall = pte;
  const toefl = parseBulkNumberInput(form.toefl_overall);
  if (toefl != null) values.toefl_overall = toefl;
  const duolingo = parseBulkNumberInput(form.duolingo_overall);
  if (duolingo != null) values.duolingo_overall = duolingo;
  if (form.moi_accepted === "yes") values.moi_accepted = true;
  if (form.moi_accepted === "no") values.moi_accepted = false;
  return values;
}

export function detectedValuesToEnglishForm(
  detected: Partial<Record<ProgramBulkFieldId, unknown>>,
): EnglishRequirementsForm {
  return {
    ielts_overall: detected.ielts_overall != null ? String(detected.ielts_overall) : "",
    ielts_min_component: detected.ielts_min_component != null ? String(detected.ielts_min_component) : "",
    pte_overall: detected.pte_overall != null ? String(detected.pte_overall) : "",
    toefl_overall: detected.toefl_overall != null ? String(detected.toefl_overall) : "",
    duolingo_overall: detected.duolingo_overall != null ? String(detected.duolingo_overall) : "",
    moi_accepted:
      detected.moi_accepted === true
        ? "yes"
        : detected.moi_accepted === false
          ? "no"
          : "",
  };
}

export function buildStagingPatchForRow(
  row: UpiCourseStaging,
  values: Partial<Record<ProgramBulkFieldId, unknown>>,
  fieldIds: ProgramBulkFieldId[],
  mode: BulkApplyMode,
): Partial<UpiCourseStaging> | null {
  const columns: Partial<UpiCourseStaging> = {};
  const metaPatch: Record<string, unknown> = {};
  let changed = false;

  for (const fieldId of fieldIds) {
    if (!(fieldId in values)) continue;
    const def = getBulkFieldDef(fieldId);
    const nextValue = values[fieldId];
    if (isValueEmpty(nextValue, def.type)) continue;

    const current = readBulkFieldValue(row, def);
    const empty = isValueEmpty(current, def.type);
    if (mode === "empty_only" && !empty) continue;
    if (mode === "overwrite" && Object.is(current, nextValue)) continue;

    if (def.kind === "column" && def.column) {
      (columns as Record<string, unknown>)[def.column] = nextValue;
      changed = true;
    } else if (def.metaKey) {
      metaPatch[def.metaKey] = nextValue;
      changed = true;
    }
  }

  if (!changed) return null;

  if (Object.keys(metaPatch).length) {
    columns.metadata = { ...metaRecord(row), ...metaPatch };
  }

  return columns;
}

export function applyPatchToRow(row: UpiCourseStaging, patch: Partial<UpiCourseStaging>): UpiCourseStaging {
  return { ...row, ...patch };
}

export function patchRowsWithFieldApply(
  rows: UpiCourseStaging[],
  targetIds: string[],
  values: Partial<Record<ProgramBulkFieldId, unknown>>,
  fieldIds: ProgramBulkFieldId[],
  mode: BulkApplyMode,
): UpiCourseStaging[] {
  const idSet = new Set(targetIds);
  return rows.map((row) => {
    if (!idSet.has(row.id)) return row;
    const patch = buildStagingPatchForRow(row, values, fieldIds, mode);
    return patch ? applyPatchToRow(row, patch) : row;
  });
}

export function resolveSingleInstitutionId(
  selectedRows: UpiCourseStaging[],
): { institutionId: string | null; mixed: boolean } {
  const ids = new Set(selectedRows.map((r) => r.institution_id).filter(Boolean) as string[]);
  if (ids.size === 0) return { institutionId: null, mixed: false };
  if (ids.size === 1) return { institutionId: [...ids][0], mixed: false };
  return { institutionId: null, mixed: true };
}

/** Fill missing English fields on import payloads from existing institution programs. */
export function applyInstitutionEnglishToPayload<T extends Record<string, unknown>>(
  payload: T,
  institutionRows: UpiCourseStaging[],
  institutionId: string,
): T {
  const detected = detectInstitutionFieldValues(
    institutionId,
    institutionRows,
    ENGLISH_BULK_FIELDS.map((f) => f.id),
  );
  if (!Object.keys(detected).length) return payload;

  const next = { ...payload } as T & Partial<UpiCourseStaging> & { metadata?: Record<string, unknown> };
  const meta = { ...((next.metadata as Record<string, unknown> | undefined) ?? {}) };

  for (const field of ENGLISH_BULK_FIELDS) {
    if (!(field.id in detected)) continue;
    const value = detected[field.id];
    if (field.kind === "column" && field.column) {
      const current = next[field.column as keyof typeof next];
      if (!isValueEmpty(current, field.type)) continue;
      (next as Record<string, unknown>)[field.column] = value;
    } else if (field.metaKey) {
      if (!isValueEmpty(meta[field.metaKey], field.type)) continue;
      meta[field.metaKey] = value;
    }
  }

  next.metadata = meta;
  return next;
}
