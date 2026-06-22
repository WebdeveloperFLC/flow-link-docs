import {
  addCaseDocumentRequirement,
  type AddCaseDocumentRequirementParams,
} from "./addCaseDocumentRequirement";
import type { ApplicationDocumentRequirement } from "./types";
import {
  buildProfileDocumentPlan,
  PROFILE_DEFAULT_NOTE,
  PROFILE_SUGGEST_NOTE,
  sectionForDocumentCode,
  type ClientProfileSignals,
  type VisaProfileContext,
} from "./visaDocumentProfiles";

export async function ensureProfileDocumentRequirements(opts: {
  caseId: string;
  ctx: VisaProfileContext;
  signals: ClientProfileSignals;
  catalogueCodes: ReadonlySet<string>;
  existing: ApplicationDocumentRequirement[];
}): Promise<{ added: number; skippedTemplateBootstrap: true }> {
  const existingCodes = new Set(
    opts.existing
      .filter((r) => r.requirement_kind === "document" && !r.is_suppressed)
      .map((r) => r.master_item_code),
  );

  const plan = buildProfileDocumentPlan(opts.ctx, opts.signals, opts.catalogueCodes);
  let added = 0;

  for (const doc of plan) {
    if (existingCodes.has(doc.code)) continue;

    const section = sectionForDocumentCode(doc.code);
    const notes = doc.layer === "default" ? PROFILE_DEFAULT_NOTE : PROFILE_SUGGEST_NOTE;

    const params: AddCaseDocumentRequirementParams = {
      caseId: opts.caseId,
      masterItemCode: doc.code,
      mandatory: doc.mandatory,
      sectionKey: section.key,
      sectionLabel: section.label,
      notes,
    };

    const result = await addCaseDocumentRequirement(params);
    if (result.ok) {
      existingCodes.add(doc.code);
      added += 1;
    }
  }

  return { added, skippedTemplateBootstrap: true };
}

/** True when row was seeded from visa profile (not legacy template). */
export function isProfileSourcedRequirement(notes: string | null | undefined): boolean {
  return notes === PROFILE_DEFAULT_NOTE || notes === PROFILE_SUGGEST_NOTE;
}

export function isSuggestedRequirement(notes: string | null | undefined): boolean {
  return notes === PROFILE_SUGGEST_NOTE;
}
