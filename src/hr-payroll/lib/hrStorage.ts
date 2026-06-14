import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "./constants";

export const HR_DOC_TYPES = [
  "Offer Letter",
  "Appointment Letter",
  "Aadhaar Card",
  "PAN Card",
  "Passport",
  "Resume",
  "Form 16",
  "Bank Proof",
  "Other",
] as const;

export type HrDocType = (typeof HR_DOC_TYPES)[number];

export function hrDocStoragePath(employeeId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${HR_ORG_ID}/${employeeId}/${Date.now()}-${safe}`;
}

export async function uploadHrDocument(
  employeeId: string,
  file: File,
  docType: string,
): Promise<{ id: string; storage_path: string }> {
  const storagePath = hrDocStoragePath(employeeId, file.name);

  const { error: upErr } = await supabase.storage.from("hr-docs").upload(storagePath, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("employee_documents" as never)
    .insert({
      org_id: HR_ORG_ID,
      employee_id: employeeId,
      doc_type: docType,
      file_name: file.name,
      storage_path: storagePath,
      mime: file.type || null,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    } as never)
    .select("id, storage_path")
    .single();

  if (error) {
    await supabase.storage.from("hr-docs").remove([storagePath]);
    throw error;
  }

  return data as { id: string; storage_path: string };
}

export async function getHrDocumentSignedUrl(storagePath: string, expiresSec = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from("hr-docs")
    .createSignedUrl(storagePath, expiresSec);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Could not create signed URL");
  return data.signedUrl;
}

export async function deleteHrDocument(docId: string, storagePath: string | null): Promise<void> {
  const { error } = await supabase.from("employee_documents" as never).delete().eq("id", docId);
  if (error) throw error;
  if (storagePath) {
    await supabase.storage.from("hr-docs").remove([storagePath]);
  }
}
