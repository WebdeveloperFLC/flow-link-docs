import { isChecklistAlias } from "@/lib/checklist";
import type { ApplicationDocumentRequirement } from "./types";
import type { WorkflowDocument } from "./workflowDocument";

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function docLabels(d: WorkflowDocument): string[] {
  const primary = d.document_type === "Other" ? (d.custom_type ?? "") : d.document_type;
  const custom = d.custom_type ?? "";
  return [primary, custom].filter(Boolean);
}

function personMatches(
  doc: WorkflowDocument,
  req: ApplicationDocumentRequirement,
): boolean {
  if (!req.person_id) return true;
  if (doc.person_id === req.person_id) return true;
  if (req.party_scope === "shared" && doc.is_shared) return true;
  return !doc.person_id;
}

/** Pick the best active document row for a requirement. */
export function matchDocumentToRequirement(
  req: ApplicationDocumentRequirement,
  docs: WorkflowDocument[],
  labelByCode: Map<string, string>,
): WorkflowDocument | null {
  const active = docs.filter(
    (d) => !d.deleted_at && d.is_active_version !== false,
  );

  const scoped = active.filter((d) => personMatches(d, req));

  const byCode = scoped
    .filter((d) => d.master_item_code && d.master_item_code === req.master_item_code)
    .sort((a, b) => b.version - a.version)[0];
  if (byCode) return byCode;

  const canonicalLabel = labelByCode.get(req.master_item_code) ?? req.display_name;
  const targets = [req.display_name, canonicalLabel].filter(Boolean);

  for (const d of scoped.sort((a, b) => b.version - a.version)) {
    for (const label of docLabels(d)) {
      for (const target of targets) {
        if (norm(label) === norm(target)) return d;
        if (isChecklistAlias(label, target)) return d;
      }
    }
  }

  return null;
}
