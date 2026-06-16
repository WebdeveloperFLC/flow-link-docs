import { supabase } from "@/integrations/supabase/client";
import { completeClientServiceEnrollment } from "@/lib/service-library/completeClientServiceEnrollment";
import {
  createServiceCase,
  nextAttemptNumber,
  type ClientServiceCase,
} from "@/lib/clientServiceCase";
import { closeCaseWithOutcome, uploadOutcomeDocument } from "@/lib/caseOutcome";
import { resolvePipelineForServiceCode } from "@/lib/clientActiveService";
import { fetchAllServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";
import { parseLibraryIdFromServiceCode } from "@/lib/service-library/serviceCodes";

export type ReapplyTransferOptions = {
  profile: boolean;
  family: boolean;
  documents: string[];
  tests: boolean;
  programmes: boolean;
  forms: boolean;
  refusalLetter: boolean;
};

export type ReapplyParams = {
  sourceCase: ClientServiceCase;
  clientId: string;
  targetServiceCode: string;
  targetLibraryId: string;
  targetCountry: string;
  targetServiceTitle: string;
  targetSubService: string;
  targetCategory: string;
  originalOutcome: "refused" | "withdrawn" | "open";
  actorId: string | null;
  transfer: ReapplyTransferOptions;
  catalogue?: ServiceCatalogueItem[];
};

function sameService(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function defaultTransfer(same: boolean): ReapplyTransferOptions {
  if (same) {
    return {
      profile: true,
      family: true,
      documents: ["*"],
      tests: true,
      programmes: true,
      forms: true,
      refusalLetter: true,
    };
  }
  return {
    profile: true,
    family: true,
    documents: [],
    tests: true,
    programmes: false,
    forms: false,
    refusalLetter: true,
  };
}

export function buildDefaultTransfer(
  sourceServiceCode: string,
  targetServiceCode: string,
): ReapplyTransferOptions {
  return defaultTransfer(sameService(sourceServiceCode, targetServiceCode));
}

export async function listTransferableDocuments(clientId: string): Promise<
  Array<{ id: string; label: string; documentType: string }>
> {
  const { data } = await supabase
    .from("client_documents")
    .select("id, document_type, custom_type, file_name")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });
  return (data ?? []).map((d) => ({
    id: d.id as string,
    label: (d.custom_type as string | null) || (d.document_type as string) || (d.file_name as string),
    documentType: d.document_type as string,
  }));
}

async function copyDocumentRow(
  docId: string,
  clientId: string,
  newCaseId: string,
): Promise<void> {
  const { data: src } = await supabase
    .from("client_documents")
    .select("*")
    .eq("id", docId)
    .maybeSingle();
  if (!src) return;
  const row = src as Record<string, unknown>;
  await supabase.from("client_documents").insert({
    client_id: clientId,
    case_id: newCaseId,
    document_type: row.document_type,
    custom_type: row.custom_type,
    file_name: row.file_name,
    storage_path: row.storage_path,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    version: row.version,
    status: row.status,
    section_id: row.section_id,
    section_order: row.section_order,
    person_id: row.person_id,
    is_shared: row.is_shared,
  });
}

async function applyTransfer(params: ReapplyParams, newCaseId: string): Promise<void> {
  const same = sameService(params.sourceCase.serviceCode, params.targetServiceCode);
  const t = params.transfer;

  if (same) {
    // Profile, family, tests, programmes, forms live on client — no copy needed.
    // Tag all existing docs with case association via copy rows for case-scoped view.
    const { data: docs } = await supabase
      .from("client_documents")
      .select("id")
      .eq("client_id", params.clientId)
      .is("deleted_at", null);
    for (const d of docs ?? []) {
      await copyDocumentRow(d.id as string, params.clientId, newCaseId);
    }
    return;
  }

  if (t.documents.includes("*")) {
    const { data: docs } = await supabase
      .from("client_documents")
      .select("id")
      .eq("client_id", params.clientId)
      .is("deleted_at", null);
    for (const d of docs ?? []) {
      await copyDocumentRow(d.id as string, params.clientId, newCaseId);
    }
  } else {
    for (const docId of t.documents) {
      await copyDocumentRow(docId, params.clientId, newCaseId);
    }
  }

  if (t.refusalLetter && params.sourceCase.outcomeDocumentId) {
    await copyDocumentRow(params.sourceCase.outcomeDocumentId, params.clientId, newCaseId);
  }
}

export async function executeReapplication(params: ReapplyParams): Promise<{
  newCaseId: string;
  serviceCode: string;
}> {
  const catalogue = params.catalogue ?? (await fetchAllServiceCatalogue().catch(() => []));
  const clientCountry =
    (
      await supabase.from("clients").select("country").eq("id", params.clientId).maybeSingle()
    ).data?.country ?? null;

  if (params.originalOutcome !== "open" && params.sourceCase.status === "open") {
    await closeCaseWithOutcome({
      caseId: params.sourceCase.id,
      clientId: params.clientId,
      outcome: params.originalOutcome,
      actorId: params.actorId,
      refusalDocPending: params.originalOutcome === "refused",
      note: "Closed for reapplication",
    });
  }

  const pipeline = await resolvePipelineForServiceCode(
    params.targetServiceCode,
    catalogue,
    clientCountry,
  );

  const attempt = await nextAttemptNumber(params.clientId, params.targetServiceCode);
  const newCase = await createServiceCase({
    clientId: params.clientId,
    serviceCode: params.targetServiceCode,
    pipelineId: pipeline?.pipelineId ?? null,
    attemptNumber: attempt,
    reapplicationOf: params.sourceCase.id,
  });

  await applyTransfer(params, newCase.id);

  await completeClientServiceEnrollment({
    clientId: params.clientId,
    libraryId: params.targetLibraryId,
    country: params.targetCountry,
    serviceTitle: params.targetServiceTitle,
    subService: params.targetSubService,
    serviceCategory: params.targetCategory,
    serviceCode: params.targetServiceCode,
    appendService: !sameService(params.sourceCase.serviceCode, params.targetServiceCode),
    catalogue,
  });

  if (pipeline) {
    await supabase
      .from("clients")
      .update({
        pipeline_id: pipeline.pipelineId,
        current_stage_id: pipeline.stageId,
      })
      .eq("id", params.clientId);
  }

  await supabase.from("client_case_outcome_log").insert({
    client_id: params.clientId,
    case_id: newCase.id,
    action: "reapply_created",
    actor_id: params.actorId,
    metadata: {
      reapplication_of: params.sourceCase.id,
      target_service_code: params.targetServiceCode,
    },
  });

  return { newCaseId: newCase.id, serviceCode: params.targetServiceCode };
}

export { parseLibraryIdFromServiceCode };
