import { fetchList } from "@/lib/masters";
import { supabase } from "@/integrations/supabase/client";
import {
  addCaseDocumentRequirement,
  type AddCaseDocumentRequirementParams,
} from "./addCaseDocumentRequirement";
import {
  buildDefaultDocumentPlan,
  PROFILE_DEFAULT_NOTE,
  sectionForDocumentCode,
  type DocumentProfileContext,
} from "./visaDocumentProfiles";
import { resolveServiceDocumentProfile } from "./resolveServiceDocumentProfile";

export async function fetchActiveDocumentTypeCodes(): Promise<Set<string>> {
  const items = await fetchList("document_types");
  return new Set(items.filter((m) => m.is_active).map((m) => m.code));
}

async function fetchExistingRequirementCodes(caseId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("application_document_requirements" as never)
    .select("master_item_code")
    .eq("client_service_case_id", caseId)
    .eq("is_suppressed", false)
    .eq("requirement_kind", "document");
  if (error) throw error;
  return new Set(
    ((data ?? []) as { master_item_code: string }[]).map((r) => r.master_item_code),
  );
}

/** Seed default document requirements for a case — defaults only, never suggestions. */
export async function seedDefaultDocumentRequirements(opts: {
  caseId: string;
  profile: DocumentProfileContext;
  catalogueCodes?: ReadonlySet<string>;
}): Promise<{ added: number; skipped: number }> {
  const catalogueCodes = opts.catalogueCodes ?? (await fetchActiveDocumentTypeCodes());
  const existingCodes = await fetchExistingRequirementCodes(opts.caseId);
  const plan = buildDefaultDocumentPlan(opts.profile, catalogueCodes);

  let added = 0;
  let skipped = 0;

  for (const doc of plan) {
    if (existingCodes.has(doc.code)) {
      skipped += 1;
      continue;
    }

    const section = sectionForDocumentCode(doc.code);
    const params: AddCaseDocumentRequirementParams = {
      caseId: opts.caseId,
      masterItemCode: doc.code,
      mandatory: doc.mandatory,
      sectionKey: section.key,
      sectionLabel: section.label,
      notes: PROFILE_DEFAULT_NOTE,
    };

    const result = await addCaseDocumentRequirement(params);
    if (result.ok) {
      existingCodes.add(doc.code);
      added += 1;
    } else {
      skipped += 1;
    }
  }

  return { added, skipped };
}

/** Seed defaults when a case has no profile-sourced requirements (backfill). */
export async function seedDefaultDocumentRequirementsIfEmpty(opts: {
  caseId: string;
  serviceCode: string;
}): Promise<{ added: number; skipped: number; seeded: boolean }> {
  const { data, error } = await supabase
    .from("application_document_requirements" as never)
    .select("id")
    .eq("client_service_case_id", opts.caseId)
    .eq("is_suppressed", false)
    .eq("requirement_kind", "document")
    .eq("notes", PROFILE_DEFAULT_NOTE)
    .limit(1);
  if (error) throw error;
  if ((data ?? []).length > 0) {
    return { added: 0, skipped: 0, seeded: false };
  }

  const resolved = resolveServiceDocumentProfile(opts.serviceCode);
  const profile: DocumentProfileContext = {
    profileType: resolved.profileType,
    country: resolved.country,
  };
  const result = await seedDefaultDocumentRequirements({ caseId: opts.caseId, profile });
  return { ...result, seeded: result.added > 0 };
}

export async function seedDefaultDocumentRequirementsForServiceCode(opts: {
  caseId: string;
  serviceCode: string;
}): Promise<{ added: number; skipped: number }> {
  const resolved = resolveServiceDocumentProfile(opts.serviceCode);
  return seedDefaultDocumentRequirements({
    caseId: opts.caseId,
    profile: { profileType: resolved.profileType, country: resolved.country },
  });
}
