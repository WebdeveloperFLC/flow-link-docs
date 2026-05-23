import { supabase } from "@/integrations/supabase/client";

const BUCKET = "client-documents";

export type ProofUploadResult = {
  documentId: string;
  storagePath: string;
  fileName: string;
};

/**
 * Uploads a payment proof file to client-documents bucket and creates
 * a client_documents row. Returns the document id to attach to the payment.
 */
export async function uploadPaymentProof(opts: {
  clientId: string;
  invoiceId: string;
  file: File;
}): Promise<ProofUploadResult> {
  const { clientId, invoiceId, file } = opts;
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id ?? null;

  const ext = file.name.split(".").pop() || "bin";
  const path = `${clientId}/payment-proofs/${invoiceId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data: doc, error: docErr } = await supabase
    .from("client_documents")
    .insert({
      client_id: clientId,
      document_type: "payment_proof",
      file_name: file.name,
      storage_path: path,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: uid,
      status: "uploaded",
    } as any)
    .select("id")
    .single();
  if (docErr) throw docErr;

  return { documentId: doc!.id as string, storagePath: path, fileName: file.name };
}

export function isProofRequired(method: string): boolean {
  return ["bank_transfer", "wire", "upi", "cheque", "card", "etransfer"].includes(method);
}

export function defaultPaymentStatus(method: string): "verified" | "awaiting_verification" {
  // cash / wallet / referral_credits / points / online_gateway → instant verified
  // bank_transfer / wire / upi / cheque → awaiting verification
  return isProofRequired(method) ? "awaiting_verification" : "verified";
}