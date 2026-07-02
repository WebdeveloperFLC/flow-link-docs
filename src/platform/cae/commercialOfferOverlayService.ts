/**
 * Temporary Commercial Offer Overlays — never modify master agreement versions.
 */
import { supabase } from "@/integrations/supabase/client";
import { createBusinessEvent } from "../foe/businessEventService";
import type { CommercialOfferOverlay, CreateOfferOverlayInput } from "./types";
import { computeCommercialValidityStatus } from "./validityStatus";
import { DEFAULT_COMMERCIAL_AGREEMENT_CONFIG } from "./defaultCommercialAgreementConfig";
import { sortOverlaysByPrecedence } from "./overlayPrecedence";

function mapRow(row: Record<string, unknown>): CommercialOfferOverlay {
  return {
    id: String(row.id),
    masterAgreementId: String(row.master_agreement_id),
    relationshipId: (row.relationship_id as string) ?? null,
    offerType: String(row.offer_type),
    name: String(row.name),
    description: (row.description as string) ?? null,
    financialImpact: (row.financial_impact as Record<string, unknown>) ?? {},
    validFrom: String(row.valid_from),
    validUntil: String(row.valid_until),
    status: String(row.status),
    precedenceRank: row.precedence_rank != null ? Number(row.precedence_rank) : undefined,
    stackLayer: (row.stack_layer as string) ?? undefined,
    supersedesOverlayId: (row.supersedes_overlay_id as string) ?? null,
    appliesToJson: (row.applies_to_json as Record<string, unknown>) ?? {},
    supportingDocumentPaths: (row.supporting_document_paths as string[]) ?? [],
    approvalReference: (row.approval_reference as string) ?? null,
    budgetAmount: row.budget_amount != null ? Number(row.budget_amount) : null,
    budgetCurrency: (row.budget_currency as string) ?? null,
    targetJson: (row.target_json as Record<string, unknown>) ?? {},
    adapterSourceModule: (row.adapter_source_module as string) ?? null,
    adapterSourceRecordId: (row.adapter_source_record_id as string) ?? null,
  };
}

export async function createOfferOverlay(
  input: CreateOfferOverlayInput,
): Promise<{ ok: boolean; overlay?: CommercialOfferOverlay; error?: string }> {
  if (input.validUntil < input.validFrom) {
    return { ok: false, error: "validUntil must be on or after validFrom" };
  }

  try {
    const event = await createBusinessEvent({
      domain: "generic",
      eventType: "cae_offer_overlay_created",
      sourceModule: "CAE",
      sourceRecordId: input.masterAgreementId,
      createdBy: input.createdBy ?? null,
      metadata: { offer_type: input.offerType, name: input.name },
    });

    const asOf = new Date().toISOString().slice(0, 10);
    const validity = computeCommercialValidityStatus(input.validFrom, input.validUntil, asOf);
    const status = validity === "expired" ? "expired" : validity === "upcoming" ? "draft" : "active";

    const { data, error } = await supabase
      .from("commercial_offer_overlays" as never)
      .insert({
        master_agreement_id: input.masterAgreementId,
        relationship_id: input.relationshipId ?? null,
        offer_type: input.offerType,
        name: input.name,
        description: input.description ?? null,
        financial_impact: input.financialImpact ?? {},
        valid_from: input.validFrom,
        valid_until: input.validUntil,
        status,
        precedence_rank:
          input.precedenceRank ?? DEFAULT_COMMERCIAL_AGREEMENT_CONFIG.overlayPrecedenceDefault ?? 100,
        stack_layer: input.stackLayer ?? "overlay",
        supersedes_overlay_id: input.supersedesOverlayId ?? null,
        applies_to_json: input.appliesToJson ?? {},
        supporting_document_paths: input.supportingDocumentPaths ?? [],
        approval_reference: input.approvalReference ?? null,
        budget_amount: input.budgetAmount ?? null,
        budget_currency: input.budgetCurrency ?? "INR",
        target_json: input.targetJson ?? {},
        adapter_source_module: input.adapterSourceModule ?? null,
        adapter_source_record_id: input.adapterSourceRecordId ?? null,
        business_event_id: event.id,
        created_by: input.createdBy ?? null,
      } as never)
      .select("*")
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    return { ok: true, overlay: mapRow(data as Record<string, unknown>) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function listOfferOverlaysForAgreement(
  masterAgreementId: string,
  opts?: { includeExpired?: boolean },
): Promise<CommercialOfferOverlay[]> {
  try {
    let q = supabase
      .from("commercial_offer_overlays" as never)
      .select("*")
      .eq("master_agreement_id", masterAgreementId as never)
      .order("precedence_rank", { ascending: true })
      .order("valid_from", { ascending: false });

    if (!opts?.includeExpired) {
      q = q.neq("status", "expired" as never);
    }

    const { data } = await q;
    return ((data ?? []) as Record<string, unknown>[]).map(mapRow);
  } catch {
    return [];
  }
}

/** Overlays eligible for new settlements at asOf date */
export async function listActiveOfferOverlays(
  masterAgreementId: string,
  asOfDate?: string,
): Promise<CommercialOfferOverlay[]> {
  const asOf = asOfDate ?? new Date().toISOString().slice(0, 10);
  const all = await listOfferOverlaysForAgreement(masterAgreementId, { includeExpired: true });
  return sortOverlaysByPrecedence(
    all.filter((o) => {
      const status = computeCommercialValidityStatus(o.validFrom, o.validUntil, asOf);
      return status === "active" || status === "expiring_soon";
    }),
  );
}

export function overlaySettlementAllowed(
  overlay: CommercialOfferOverlay,
  asOfDate?: string,
): boolean {
  const asOf = asOfDate ?? new Date().toISOString().slice(0, 10);
  const status = computeCommercialValidityStatus(overlay.validFrom, overlay.validUntil, asOf);
  return status === "active" || status === "expiring_soon";
}
