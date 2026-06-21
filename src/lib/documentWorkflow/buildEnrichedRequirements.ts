import { matchDocumentToRequirement } from "./matchDocumentToRequirement";
import {
  counselorSectionSortIndex,
  resolveCounselorSectionForRequirement,
} from "./counselorSections";
import {
  resolveRequirementDisplayStatus,
  type RequirementDisplayStatus,
} from "./resolveDisplayStatus";
import { compareSectionKeys } from "./sectionOrder";
import type { ApplicationDocumentRequirement, CaseDocumentProgress } from "./types";
import { documentCountsAsUploaded } from "./types";
import type { WorkflowDocument } from "./workflowDocument";

export interface EnrichedRequirement extends ApplicationDocumentRequirement {
  matchedDocument: WorkflowDocument | null;
  displayStatus: RequirementDisplayStatus;
  anchorId: string;
}

export interface DocumentSectionGroup {
  sectionKey: string;
  sectionLabel: string;
  requirements: EnrichedRequirement[];
}

export function buildEnrichedRequirements(
  requirements: ApplicationDocumentRequirement[],
  documents: WorkflowDocument[],
  labelByCode: Map<string, string>,
): EnrichedRequirement[] {
  const usedDocIds = new Set<string>();

  const enriched = requirements.map((req) => {
    const matchedDocument = matchDocumentToRequirement(req, documents, labelByCode);
    if (matchedDocument) usedDocIds.add(matchedDocument.id);
    const displayStatus = resolveRequirementDisplayStatus(
      !!matchedDocument,
      matchedDocument?.status,
    );
    return {
      ...req,
      matchedDocument,
      displayStatus,
      anchorId: `req-${req.id}`,
    };
  });

  return enriched;
}

export function groupRequirementsBySection(
  requirements: EnrichedRequirement[],
): DocumentSectionGroup[] {
  const map = new Map<string, DocumentSectionGroup>();
  for (const req of requirements) {
    const key = req.section_key || "other";
    let group = map.get(key);
    if (!group) {
      group = {
        sectionKey: key,
        sectionLabel: req.section_label || key,
        requirements: [],
      };
      map.set(key, group);
    }
    group.requirements.push(req);
  }
  return Array.from(map.values())
    .map((g) => ({
      ...g,
      requirements: g.requirements.sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => compareSectionKeys(a.sectionKey, b.sectionKey));
}

/** Group by approved counselor sections (Identity, Relationship, Financial, …). */
export function groupRequirementsByCounselorSection(
  requirements: EnrichedRequirement[],
): DocumentSectionGroup[] {
  const map = new Map<string, DocumentSectionGroup>();
  for (const req of requirements) {
    const { key, label } = resolveCounselorSectionForRequirement(req);
    let group = map.get(key);
    if (!group) {
      group = { sectionKey: key, sectionLabel: label, requirements: [] };
      map.set(key, group);
    }
    group.requirements.push(req);
  }
  return Array.from(map.values())
    .map((g) => ({
      ...g,
      requirements: g.requirements.sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => counselorSectionSortIndex(a.sectionKey) - counselorSectionSortIndex(b.sectionKey));
}

export function computeCaseDocumentProgress(
  requirements: EnrichedRequirement[],
): CaseDocumentProgress {
  const mandatory = requirements.filter((r) => r.mandatory);
  const required = mandatory.length;
  const uploaded = mandatory.filter((r) =>
    r.matchedDocument && documentCountsAsUploaded(r.matchedDocument.status),
  ).length;
  const missing = required - uploaded;
  const completionPct = required > 0 ? Math.round((uploaded / required) * 100) : 100;
  return { required, uploaded, missing, completionPct };
}

export function getMissingMandatory(requirements: EnrichedRequirement[]): EnrichedRequirement[] {
  return requirements.filter(
    (r) => r.mandatory && r.displayStatus === "missing",
  );
}
