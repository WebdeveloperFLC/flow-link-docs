import { supabase } from "@/integrations/supabase/client";
import { upsertDocumentRef } from "@/lib/profile/clientDocumentRefs";
import { slotLabel } from "@/lib/profile/profileDocumentSlots";
import { isDocumentRefsUnavailableError } from "@/lib/profile/profileSaveError";

export interface ProfileDocumentUploadInput {
  clientId: string;
  file: File;
  documentType: string;
  refKey: string;
  slot: string;
  sectionId?: string | null;
}

export interface ProfileDocumentUploadResult {
  document_id: string;
  file_name: string;
  slot: string;
  label: string;
  ref_key: string;
  linked_at: string;
}

/**
 * Upload a file to client_documents and link it to a profile record via client_document_refs.
 * Does not delete or replace existing links — caller adds to linked_documents[].
 */
export async function uploadAndLinkProfileDocument(
  input: ProfileDocumentUploadInput,
): Promise<ProfileDocumentUploadResult> {
  const ext = input.file.name.split(".").pop() ?? "bin";
  const storagePath = `${input.clientId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("client-documents")
    .upload(storagePath, input.file, { upsert: false });
  if (uploadErr) throw uploadErr;

  const { data: docRow, error: insertErr } = await supabase
    .from("client_documents")
    .insert({
      client_id: input.clientId,
      file_name: input.file.name,
      storage_path: storagePath,
      document_type: input.documentType,
      section_id: input.sectionId ?? null,
      mime_type: input.file.type || null,
      file_size: input.file.size,
    })
    .select("id, file_name")
    .single();

  if (insertErr) throw insertErr;

  const label = slotLabel(input.slot);
  try {
    await upsertDocumentRef({
      client_id: input.clientId,
      document_id: docRow.id as string,
      ref_key: input.refKey,
      slot: input.slot,
      label,
    });
  } catch (refErr) {
    if (!isDocumentRefsUnavailableError(refErr)) throw refErr;
    console.warn(
      "[uploadAndLinkProfileDocument] client_document_refs unavailable — file saved; link persists when profile section is saved.",
      refErr,
    );
  }

  return {
    document_id: docRow.id as string,
    file_name: docRow.file_name as string,
    slot: input.slot,
    label,
    ref_key: input.refKey,
    linked_at: new Date().toISOString(),
  };
}
