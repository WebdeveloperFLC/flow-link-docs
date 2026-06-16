import { supabase } from "@/integrations/supabase/client";
import { processToPdf } from "@/lib/processFile";
import { sanitizeName } from "@/lib/constants";
import type { CaseOutcome } from "@/lib/clientServiceCase";

export async function uploadOutcomeDocument(params: {
  clientId: string;
  caseId: string;
  file: File;
  documentType: string;
  customType?: string | null;
}): Promise<string> {
  const processed = await processToPdf(params.file, params.file.name.replace(/\.[^.]+$/, ""));
  const path = `${params.clientId}/outcomes/${params.caseId}/${Date.now()}_${processed.name}`;
  const { error: upErr } = await supabase.storage
    .from("client-documents")
    .upload(path, processed, { contentType: "application/pdf" });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("client_documents")
    .insert({
      client_id: params.clientId,
      case_id: params.caseId,
      document_type: params.documentType,
      custom_type: params.customType ?? null,
      file_name: processed.name,
      storage_path: path,
      mime_type: "application/pdf",
      size_bytes: processed.size,
      version: 1,
      status: "processed",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function closeCaseWithOutcome(params: {
  caseId: string;
  clientId: string;
  outcome: CaseOutcome;
  actorId: string | null;
  documentId?: string | null;
  refusalDocPending?: boolean;
  note?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("client_service_cases")
    .update({
      status: "closed",
      outcome: params.outcome,
      outcome_at: now,
      outcome_by: params.actorId,
      outcome_document_id: params.documentId ?? null,
      refusal_doc_pending: params.refusalDocPending ?? false,
      closed_at: now,
    })
    .eq("id", params.caseId);
  if (updErr) throw updErr;

  const action =
    params.outcome === "approved" ? "approved" : params.outcome === "withdrawn" ? "withdrawn" : "refused";

  const { error: logErr } = await supabase.from("client_case_outcome_log").insert({
    client_id: params.clientId,
    case_id: params.caseId,
    action,
    note: params.note ?? null,
    document_id: params.documentId ?? null,
    actor_id: params.actorId,
    metadata: {
      refusal_doc_pending: params.refusalDocPending ?? false,
    },
  });
  if (logErr) throw logErr;
}

export async function attachRefusalDocument(params: {
  caseId: string;
  clientId: string;
  documentId: string;
  actorId: string | null;
}): Promise<void> {
  const { error: updErr } = await supabase
    .from("client_service_cases")
    .update({
      outcome_document_id: params.documentId,
      refusal_doc_pending: false,
    })
    .eq("id", params.caseId);
  if (updErr) throw updErr;

  await supabase.from("client_case_outcome_log").insert({
    client_id: params.clientId,
    case_id: params.caseId,
    action: "refusal_doc_uploaded",
    document_id: params.documentId,
    actor_id: params.actorId,
  });
}
