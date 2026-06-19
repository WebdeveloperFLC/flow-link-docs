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

export async function downloadHrDocument(storagePath: string, fileName: string): Promise<void> {
  const url = await getHrDocumentSignedUrl(storagePath);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "document";
  a.rel = "noopener noreferrer";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function deleteHrDocument(docId: string, storagePath: string | null): Promise<void> {
  const { error } = await supabase.from("employee_documents" as never).delete().eq("id", docId);
  if (error) throw error;
  if (storagePath) {
    await supabase.storage.from("hr-docs").remove([storagePath]);
  }
}

export function hrPhotoStoragePath(employeeId: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  return `${HR_ORG_ID}/${employeeId}/photo.${ext}`;
}

export async function uploadEmployeePhoto(employeeId: string, file: File): Promise<string> {
  const storagePath = hrPhotoStoragePath(employeeId, file.name);

  const { error: upErr } = await supabase.storage.from("hr-docs").upload(storagePath, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (upErr) throw upErr;

  const { error } = await supabase
    .from("employees" as never)
    .update({ photo_url: storagePath } as never)
    .eq("id", employeeId);
  if (error) throw error;

  return storagePath;
}

function securityChequeStoragePath(employeeId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${HR_ORG_ID}/${employeeId}/security-cheque-${Date.now()}-${safe}`;
}

export type SecurityChequeUploadResult = {
  storage_path: string;
  file_name: string;
  uploaded_at: string;
  uploaded_by: string | null;
  uploaded_by_label: string;
};

export async function uploadSecurityCheque(
  employeeId: string,
  file: File,
  actor: { id: string | null; label: string },
  previousPath?: string | null,
): Promise<SecurityChequeUploadResult> {
  const storagePath = securityChequeStoragePath(employeeId, file.name);
  const uploadedAt = new Date().toISOString();

  const { error: upErr } = await supabase.storage.from("hr-docs").upload(storagePath, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (upErr) throw upErr;

  const { error } = await supabase
    .from("employees" as never)
    .update({
      security_cheque_storage_path: storagePath,
      security_cheque_file_name: file.name,
      security_cheque_uploaded_at: uploadedAt,
      security_cheque_uploaded_by: actor.id,
      security_cheque_uploaded_by_label: actor.label,
    } as never)
    .eq("id", employeeId);
  if (error) {
    await supabase.storage.from("hr-docs").remove([storagePath]);
    throw error;
  }

  if (previousPath && previousPath !== storagePath) {
    await supabase.storage.from("hr-docs").remove([previousPath]);
  }

  return {
    storage_path: storagePath,
    file_name: file.name,
    uploaded_at: uploadedAt,
    uploaded_by: actor.id,
    uploaded_by_label: actor.label,
  };
}

export async function deleteSecurityCheque(employeeId: string, storagePath: string | null): Promise<void> {
  const { error } = await supabase
    .from("employees" as never)
    .update({
      security_cheque_storage_path: null,
      security_cheque_file_name: null,
      security_cheque_uploaded_at: null,
      security_cheque_uploaded_by: null,
      security_cheque_uploaded_by_label: null,
    } as never)
    .eq("id", employeeId);
  if (error) throw error;
  if (storagePath) {
    await supabase.storage.from("hr-docs").remove([storagePath]);
  }
}
