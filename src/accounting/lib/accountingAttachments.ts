import { supabase } from "@/integrations/supabase/client";

export const ACCOUNTING_ATTACHMENTS_BUCKET = "accounting-attachments";

/**
 * Upload a proof-of-payment / supporting document to the private accounting
 * attachments bucket. Returns the storage path stored on the source record.
 */
export async function uploadAccountingAttachment(file: File, folder: string): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
  const path = `${folder}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage
    .from(ACCOUNTING_ATTACHMENTS_BUCKET)
    .upload(path, file, { upsert: false, cacheControl: "3600", metadata: { uploaded_by: u?.user?.id ?? "" } as any });
  if (error) throw error;
  return path;
}

/** Create a short-lived signed URL to view an attachment. */
export async function signAccountingAttachment(path: string, expiresInSeconds = 300): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(ACCOUNTING_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}
