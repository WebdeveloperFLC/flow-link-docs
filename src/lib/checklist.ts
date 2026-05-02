import { supabase } from "@/integrations/supabase/client";

/**
 * Document checklist matcher.
 *
 * The client-detail page renders the workflow's checklist by calling
 * `docByType(item.name)` which looks for a document whose `document_type` (or
 * `custom_type`) equals the checklist item name verbatim. To flip a checklist
 * row to "ready" after upload, we set the freshly-inserted document's
 * `custom_type` to the checklist item's exact label (when an alias matches),
 * which makes the next render pick it up automatically.
 *
 * No DB schema changes are needed — this only writes back `custom_type` on the
 * row we just inserted. The actual checklist state is derived at render time.
 */

/** Lower-cased aliases for each canonical checklist concept. Order doesn't
 *  matter; the first concept whose alias set contains BOTH the uploaded type
 *  and a checklist item wins. */
const ALIAS_BUCKETS: string[][] = [
  // English language tests — IELTS, TOEFL, PTE, CELPIP, Duolingo all roll up.
  [
    "english language proficiency test",
    "english proficiency test",
    "english test",
    "language test",
    "language proficiency test",
    "ielts / language test",
    "ielts",
    "ielts result",
    "toefl",
    "toefl ibt",
    "pte",
    "pte academic",
    "pte result",
    "pte score report",
    "celpip",
    "celpip-general",
    "duolingo",
    "duolingo english test",
    "duolingo result",
  ],
  // Provincial Attestation Letter (Canada SDS).
  [
    "provincial attestation letter",
    "attestation letter",
    "pal",
    "pal letter",
  ],
  // Academic transcripts / marksheets / degrees.
  [
    "academic transcripts",
    "academic marksheets",
    "marksheet",
    "marksheets",
    "transcript",
    "transcripts",
    "degree certificate",
    "diploma",
    "provisional certificate",
    "consolidated marksheet",
    "10th",
    "10th marksheet",
    "12th",
    "12th marksheet",
    "hsc",
    "ssc",
  ],
  // Resume / CV.
  ["resume", "updated resume", "cv", "curriculum vitae"],
  // Statement of purpose.
  ["sop", "statement of purpose", "personal statement"],
  // Police clearance.
  ["police clearance", "police clearance certificate", "pcc", "police certificate"],
  // Employment / experience.
  ["employment letter", "experience letter", "work experience letter"],
  // Visa forms.
  ["visa forms", "visa form", "imm forms", "imm form"],
  // Bank / financial.
  [
    "financial documents",
    "bank statement",
    "bank statements",
    "statement of account",
    "itr",
    "income tax return",
  ],
];

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Find a bucket that contains the given normalised string. */
function bucketFor(s: string): string[] | null {
  const n = norm(s);
  if (!n) return null;
  for (const bucket of ALIAS_BUCKETS) {
    if (bucket.some((alias) => norm(alias) === n)) return bucket;
  }
  return null;
}

/** Two strings are aliases iff they share a bucket OR are byte-equal after
 *  normalisation (covers types not in the bucket map, e.g. "Passport"). */
export function isChecklistAlias(uploadedType: string, checklistItemName: string): boolean {
  const a = norm(uploadedType);
  const b = norm(checklistItemName);
  if (!a || !b) return false;
  if (a === b) return true;
  // Substring match for cases like "PTE" vs "PTE Result" or "IELTS" vs "IELTS Result".
  if (a.includes(b) || b.includes(a)) {
    // Avoid false positives with very short strings — require at least 3 chars.
    if (Math.min(a.length, b.length) >= 3) return true;
  }
  const bucketA = bucketFor(uploadedType);
  if (!bucketA) return false;
  return bucketA.some((alias) => norm(alias) === b);
}

interface TemplateItemLite { id: string; name: string; mandatory?: boolean }
interface ExtraItemLite { id: string; name: string; mandatory?: boolean }

/** Load every checklist item name visible to a client (workflow_template +
 *  client.extra_items). Names are returned verbatim so they can be written
 *  straight back into `custom_type`. */
async function loadChecklistNames(clientId: string): Promise<string[]> {
  const { data: client } = await supabase
    .from("clients")
    .select("template_id, extra_items")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) return [];
  const names: string[] = [];
  if (client.template_id) {
    const { data: tpl } = await supabase
      .from("workflow_templates")
      .select("items")
      .eq("id", client.template_id)
      .maybeSingle();
    const items = (tpl?.items ?? []) as unknown as TemplateItemLite[];
    for (const it of items) if (it?.name) names.push(it.name);
  }
  const extras = (client.extra_items ?? []) as unknown as ExtraItemLite[];
  for (const it of extras) if (it?.name) names.push(it.name);
  return names;
}

/** Pick the best checklist item name (if any) for a freshly-uploaded document.
 *  Prefers the item whose name matches the uploaded `customType`/`displayTitle`
 *  most specifically (e.g., a "PTE" checklist entry beats "Language Test"). */
export async function pickChecklistName(
  clientId: string,
  documentType: string,
  customType: string | null | undefined,
  displayTitle: string | null | undefined,
): Promise<string | null> {
  const names = await loadChecklistNames(clientId);
  if (names.length === 0) return null;
  const candidates = [displayTitle, customType, documentType].filter(
    (s): s is string => !!s && !!s.trim(),
  );

  // 1) Exact (case-insensitive) match wins.
  for (const cand of candidates) {
    const hit = names.find((n) => norm(n) === norm(cand));
    if (hit) return hit;
  }
  // 2) Alias bucket match — try each candidate against each checklist name.
  for (const cand of candidates) {
    for (const n of names) {
      if (isChecklistAlias(cand, n)) return n;
    }
  }
  return null;
}

/**
 * After a document was inserted, find a matching checklist item and align the
 * row's `custom_type` to that item's name so the render-time checklist flips
 * to "ready" without any DB schema or template changes.
 *
 * Safe to call from any upload path; returns the chosen name (or null) for
 * logging / UI feedback.
 */
export async function markChecklistItemReady(
  documentId: string,
  clientId: string,
  documentType: string,
  customType: string | null | undefined,
  displayTitle: string | null | undefined,
): Promise<string | null> {
  try {
    const checklistName = await pickChecklistName(clientId, documentType, customType, displayTitle);
    if (!checklistName) return null;
    // Don't overwrite if custom_type already equals the checklist name (no-op).
    if (norm(customType ?? "") === norm(checklistName)) return checklistName;
    const { error } = await supabase
      .from("client_documents")
      .update({ custom_type: checklistName })
      .eq("id", documentId);
    if (error) {
      console.warn("[checklist] failed to set custom_type", error);
      return null;
    }
    return checklistName;
  } catch (e) {
    console.warn("[checklist] unexpected error", e);
    return null;
  }
}