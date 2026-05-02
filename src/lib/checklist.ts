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

/** Lower-cased aliases for each canonical checklist concept. Buckets list
 *  strings that mean the SAME specific concept. Two strings are aliases iff
 *  they share a specific bucket OR one is a generic-bucket label whose
 *  generic_for[] includes a specific bucket the other belongs to.
 *
 *  IMPORTANT: do not mix distinct concepts (10th vs 12th, transcripts vs
 *  specific marksheets) into one bucket — that caused a single 12th-marksheet
 *  upload to satisfy every academic checklist row. */
interface Bucket {
  /** Stable id used for cross-bucket relationships. */
  id: string;
  aliases: string[];
  /** If set, this bucket is a CATCH-ALL checklist label (e.g. "Academic
   *  Transcripts") — uploads from any listed specific bucket id satisfy it,
   *  but the catch-all does NOT satisfy a more specific row. Match is
   *  asymmetric. */
  generic_for?: string[];
}
const BUCKETS: Bucket[] = [
  // English language tests — IELTS, TOEFL, PTE, CELPIP, Duolingo all roll up.
  { id: "english_test", aliases: [
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
  ] },
  // Provincial Attestation Letter (Canada SDS).
  { id: "pal", aliases: [
    "provincial attestation letter",
    "attestation letter",
    "pal",
    "pal letter",
    "allocation of pal",
  ] },
  // 10th / SSC marksheet — KEEP separate from 12th and from transcripts.
  { id: "marksheet_10", aliases: [
    "10th",
    "10th marksheet",
    "10th certificate",
    "10th passing certificate",
    "ssc",
    "ssc marksheet",
    "secondary school certificate",
  ] },
  // 12th / HSC marksheet — KEEP separate from 10th and from transcripts.
  { id: "marksheet_12", aliases: [
    "12th",
    "12th marksheet",
    "12th certificate",
    "12th passing certificate",
    "hsc",
    "hsc marksheet",
    "higher secondary certificate",
    "higher secondary certificate examination",
  ] },
  // Bachelor's degree.
  { id: "bachelors", aliases: [
    "bachelor degree",
    "bachelors degree",
    "bachelor's degree",
    "graduation marksheet",
    "graduation certificate",
    "provisional certificate",
    "consolidated marksheet",
    "degree certificate",
    "diploma",
  ] },
  // Master's degree.
  { id: "masters", aliases: [
    "masters degree",
    "master's degree",
    "post graduation marksheet",
    "post graduation certificate",
  ] },
  // Generic "Academic Transcripts / Marksheets" bucket — catch-all checklist
  // label that ANY specific academic upload should satisfy, but uploading a
  // generic "transcript" should NOT satisfy a specific row like "12th
  // Marksheet".
  { id: "transcripts_generic", aliases: [
    "academic transcripts",
    "academic marksheets",
    "transcript",
    "transcripts",
    "marksheet",
    "marksheets",
    "all marksheets",
    "all transcripts",
  ], generic_for: ["marksheet_10", "marksheet_12", "bachelors", "masters"] },
  // Passport — common renames.
  { id: "passport", aliases: [
    "passport",
    "passport copy",
    "passport bio page",
    "passport bio-data page",
    "passport biodata",
    "passport first page",
    "passport front page",
  ] },
  // Resume / CV.
  { id: "resume", aliases: ["resume", "updated resume", "cv", "curriculum vitae"] },
  // Statement of purpose.
  { id: "sop", aliases: ["sop", "statement of purpose", "personal statement"] },
  // Police clearance.
  { id: "pcc", aliases: ["police clearance", "police clearance certificate", "pcc", "police certificate"] },
  // Employment / experience.
  { id: "experience_letter", aliases: ["employment letter", "experience letter", "work experience letter"] },
  // Visa forms.
  { id: "visa_forms", aliases: ["visa forms", "visa form", "imm forms", "imm form"] },
  // Bank / financial.
  { id: "financials", aliases: [
    "financial documents",
    "bank statement",
    "bank statements",
    "statement of account",
    "itr",
    "income tax return",
  ] },
];

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Find the bucket whose aliases include the given normalised string. */
function bucketFor(s: string): Bucket | null {
  const n = norm(s);
  if (!n) return null;
  for (const b of BUCKETS) {
    if (b.aliases.some((alias) => norm(alias) === n)) return b;
  }
  return null;
}

/** Whole-word single-token containment, e.g. "PTE" inside "PTE Result".
 *  Both sides must be ≥3 chars and the contained side must be a single token
 *  (no spaces) to avoid leaking across multi-word names. */
function singleTokenWholeWordMatch(a: string, b: string): boolean {
  if (a.length < 3 || b.length < 3) return false;
  const tokenize = (s: string) => s.split(" ").filter(Boolean);
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);
  if (aTokens.length === 1 && bTokens.includes(a)) return true;
  if (bTokens.length === 1 && aTokens.includes(b)) return true;
  return false;
}

/** Two strings are aliases iff they share a bucket OR are byte-equal after
 *  normalisation (covers types not in the bucket map, e.g. "Passport"). */
export function isChecklistAlias(uploadedType: string, checklistItemName: string): boolean {
  const a = norm(uploadedType);
  const b = norm(checklistItemName);
  if (!a || !b) return false;
  if (a === b) return true;
  // Tight whole-word, single-token containment (PTE ↔ PTE Result).
  if (singleTokenWholeWordMatch(a, b)) return true;
  const bucketA = bucketFor(uploadedType);
  const bucketB = bucketFor(checklistItemName);
  // Same specific bucket → aliases.
  if (bucketA && bucketB && bucketA.id === bucketB.id) return true;
  // Asymmetric: a generic CHECKLIST label is satisfied by any specific
  // upload it claims to cover. Reverse direction is intentionally NOT true.
  if (bucketA && bucketB && bucketB.generic_for?.includes(bucketA.id)) return true;
  return false;
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