import { appendTimeline } from "@/lib/timeline";
import type { PersonRole } from "@/lib/casePeople";
import { ROLE_PRESETS, presetItemId, type RolePresetItem } from "@/lib/rolePresets";

/** A checklist item shared between applicant and per-person workspaces. */
export interface PersonChecklistItem {
  id: string;
  name: string;
  mandatory: boolean;
  notes?: string | null;
  isExtra?: boolean;
  isPreset?: boolean;
}

export interface PersonExtraItem {
  id: string;
  name: string;
  mandatory: boolean;
  notes?: string | null;
  person_id?: string | null;
}

export interface PersonSuppressedItem {
  id: string;            // the checklist item id being suppressed
  person_id?: string | null;
}

/** Documents matter only by their typed shape — keep loose so we can accept the page's Doc type. */
export interface PersonScopedDoc {
  id: string;
  person_id?: string | null;
  document_type: string;
  custom_type: string | null;
  status?: string | null;
}

/** Documents owned by a specific person (or shared on the case). */
export function personScopedDocs<T extends PersonScopedDoc>(docs: T[], personId: string): T[] {
  return docs.filter((d) => d.person_id === personId);
}

/** Extras applicable to a specific person. Items without person_id belong to the applicant. */
export function personScopedExtras(
  items: (PersonExtraItem | { id: string; name: string; mandatory: boolean; notes?: string | null })[],
  personId: string | null,
): PersonExtraItem[] {
  return (items as PersonExtraItem[]).filter((e) => (e.person_id ?? null) === (personId ?? null));
}

/** Suppressed ids applicable to a specific person. Strings (legacy) belong to the applicant. */
export function personScopedSuppressed(
  raw: (string | PersonSuppressedItem)[] | null | undefined,
  personId: string | null,
): Set<string> {
  const out = new Set<string>();
  for (const entry of raw ?? []) {
    if (typeof entry === "string") {
      if (personId === null) out.add(entry);
    } else if ((entry.person_id ?? null) === (personId ?? null)) {
      out.add(entry.id);
    }
  }
  return out;
}

/**
 * Effective checklist for a person.
 * - Applicant: template items only (caller passes them via `templateItems`).
 * - Non-applicant: ROLE_PRESETS[role] only (templates are applicant-scoped).
 * Then add per-person extras and subtract per-person suppressed ids.
 */
export function buildPersonChecklist(
  role: PersonRole,
  templateItems: PersonChecklistItem[] | undefined,
  extras: PersonExtraItem[],
  suppressed: Set<string>,
): PersonChecklistItem[] {
  const base: PersonChecklistItem[] =
    role === "applicant"
      ? (templateItems ?? [])
      : ROLE_PRESETS[role].map((it: RolePresetItem) => ({
          id: presetItemId(role, it.name),
          name: it.name,
          mandatory: it.mandatory,
          notes: it.notes ?? null,
          isPreset: true,
        }));
  const withExtras = [
    ...base,
    ...extras.map((e) => ({
      id: e.id,
      name: e.name,
      mandatory: !!e.mandatory,
      notes: e.notes ?? null,
      isExtra: true,
    })),
  ];
  return withExtras.filter((it) => !suppressed.has(it.id));
}

/** Find the latest non-rejected doc for a checklist item name. */
function readyDocForName<T extends PersonScopedDoc>(docs: T[], name: string): T | undefined {
  const matches = docs.filter((d) => {
    const t1 = d.document_type === "Other" ? d.custom_type ?? "" : d.document_type;
    const t2 = d.custom_type ?? "";
    return t1 === name || t2 === name;
  });
  return matches.find((d) => {
    const s = d.status ?? "ready";
    return s !== "rejected" && s !== "needs_reissue";
  });
}

export interface CompletenessResult {
  requiredTotal: number;
  requiredReceived: number;
  percent: number;
  mandatoryMissing: string[]; // names, in checklist order
  rejectedCount: number;
}

export function computeCompleteness<T extends PersonScopedDoc>(
  checklist: PersonChecklistItem[],
  docs: T[],
): CompletenessResult {
  const required = checklist.filter((it) => it.mandatory);
  const received: string[] = [];
  const missing: string[] = [];
  for (const it of required) {
    if (readyDocForName(docs, it.name)) received.push(it.name);
    else missing.push(it.name);
  }
  const rejectedCount = docs.filter((d) => d.status === "rejected" || d.status === "needs_reissue").length;
  const percent = required.length === 0 ? 0 : Math.round((received.length / required.length) * 100);
  return {
    requiredTotal: required.length,
    requiredReceived: received.length,
    percent,
    mandatoryMissing: missing,
    rejectedCount,
  };
}

export type ReadinessTier = "ready" | "nearly_ready" | "missing_critical" | "not_started";

export function computeReadinessTier(c: CompletenessResult): ReadinessTier {
  if (c.requiredTotal === 0 && c.requiredReceived === 0) return "not_started";
  if (c.requiredReceived === 0) return "not_started";
  if (c.rejectedCount > 0 || c.mandatoryMissing.length >= 3) return "missing_critical";
  if (c.percent === 100 && c.rejectedCount === 0) return "ready";
  if (c.percent >= 60 && c.mandatoryMissing.length <= 2) return "nearly_ready";
  return "missing_critical";
}

export function readinessLabel(t: ReadinessTier): string {
  switch (t) {
    case "ready": return "Ready";
    case "nearly_ready": return "Nearly Ready";
    case "missing_critical": return "Missing Critical Docs";
    case "not_started": return "Not Started";
  }
}

/** Tailwind class fragment for the readiness chip. */
export function readinessChipClass(t: ReadinessTier): string {
  switch (t) {
    case "ready": return "bg-success/10 text-success border-success/30";
    case "nearly_ready": return "bg-primary/10 text-primary border-primary/30";
    case "missing_critical": return "bg-destructive/10 text-destructive border-destructive/30";
    case "not_started": return "bg-muted text-muted-foreground border-muted-foreground/20";
  }
}

/** Build a suggested binder for a person: which preset doc types are present vs missing. */
export function buildSuggestedBinder<T extends PersonScopedDoc>(
  presetTypes: string[],
  docs: T[],
): { selectedDocIds: string[]; matchedTypes: string[]; missingTypes: string[] } {
  const matched: string[] = [];
  const missing: string[] = [];
  const selected: string[] = [];
  for (const t of presetTypes) {
    const d = readyDocForName(docs, t);
    if (d) { matched.push(t); selected.push(d.id); }
    else missing.push(t);
  }
  return { selectedDocIds: selected, matchedTypes: matched, missingTypes: missing };
}

export async function appendPersonTimeline(opts: {
  clientId: string;
  personId: string;
  eventType: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}) {
  await appendTimeline({
    clientId: opts.clientId,
    eventType: opts.eventType,
    summary: opts.summary,
    metadata: { ...(opts.metadata ?? {}), person_id: opts.personId },
  });
}