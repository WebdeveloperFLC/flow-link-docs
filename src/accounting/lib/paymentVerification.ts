import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { appendTimeline } from "@/lib/timeline";

/** Mark a payment as verified. Caller should refresh after. */
export async function verifyPayment(
  payment: { id: string; client_id: string; amount: number; currency: string },
  note?: string,
) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("client_invoice_payments")
    .update({
      payment_status: "verified",
      verified_by: u?.user?.id ?? null,
      verified_at: new Date().toISOString(),
    } as any)
    .eq("id", payment.id);
  if (error) { toast.error(error.message); return false; }
  toast.success("Payment verified");
  try {
    await appendTimeline({
      clientId: payment.client_id,
      eventType: "payment_verified",
      summary: `Payment of ${payment.currency} ${Number(payment.amount).toFixed(2)} verified${note?.trim() ? ` — ${note.trim()}` : ""}`,
      metadata: { payment_id: payment.id, amount: payment.amount, currency: payment.currency, note: note?.trim() || null },
    });
  } catch {}
  return true;
}

/** Reject a payment with a reason. */
export async function rejectPayment(
  payment: { id: string; client_id: string; amount: number; currency: string },
  reason: string,
) {
  if (!reason.trim()) { toast.error("Enter a reason"); return false; }
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("client_invoice_payments")
    .update({
      payment_status: "rejected",
      verification_rejected_reason: reason,
      verified_by: u?.user?.id ?? null,
      verified_at: new Date().toISOString(),
    } as any)
    .eq("id", payment.id);
  if (error) { toast.error(error.message); return false; }
  toast.success("Payment rejected");
  try {
    await appendTimeline({
      clientId: payment.client_id,
      eventType: "payment_rejected",
      summary: `Payment of ${payment.currency} ${Number(payment.amount).toFixed(2)} rejected`,
      metadata: { payment_id: payment.id, reason, amount: payment.amount, currency: payment.currency },
    });
  } catch {}
  return true;
}

/** Opens the proof attached to a payment in a new tab via signed URL. */
export async function openPaymentProof(proofDocId: string | null | undefined) {
  if (!proofDocId) { toast.info("No proof attached"); return; }
  const { data, error } = await supabase
    .from("client_documents")
    .select("storage_path")
    .eq("id", proofDocId)
    .maybeSingle();
  if (error || !data) { toast.error("Proof not found"); return; }
  const path = (data as any).storage_path;
  if (!path) { toast.info("No file path on proof"); return; }
  const { data: signed } = await supabase.storage.from("client-documents").createSignedUrl(path, 300);
  if (signed?.signedUrl) window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
  else toast.error("Could not open proof");
}