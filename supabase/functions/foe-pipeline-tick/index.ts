import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_ATTEMPTS = 8;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: jobs, error } = await admin
      .from("platform_foe_pipeline_jobs")
      .select("id, payment_id, attempts, business_event_id")
      .in("status", ["pending", "failed"])
      .lt("attempts", MAX_ATTEMPTS)
      .order("created_at", { ascending: true })
      .limit(25);

    if (error) return json({ error: error.message }, 500);

    let completed = 0;
    let failed = 0;

    for (const job of jobs ?? []) {
      const paymentId = job.payment_id as string;

      await admin
        .from("platform_foe_pipeline_jobs")
        .update({ status: "processing", attempts: (job.attempts ?? 0) + 1 })
        .eq("id", job.id);

      const [{ data: receipt }, { data: journal }] = await Promise.all([
        admin
          .from("client_invoice_receipts")
          .select("id")
          .eq("payment_id", paymentId)
          .is("archived_at", null)
          .maybeSingle(),
        admin
          .from("accounting_journals")
          .select("id, status")
          .eq("source_module", "CRM_AR")
          .eq("source_record_id", paymentId)
          .maybeSingle(),
      ]);

      const hasReceipt = !!receipt;
      const hasJournal = !!journal;

      if (hasReceipt && hasJournal) {
        await admin
          .from("platform_foe_pipeline_jobs")
          .update({
            status: "completed",
            processed_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", job.id);

        await admin
          .from("client_invoice_payments")
          .update({
            business_status: journal?.status === "POSTED" ? "closed" : "receipt_issued",
            workflow_status: journal?.status === "POSTED" ? "completed" : "pending_journal_approval",
            accounting_status:
              journal?.status === "POSTED" ? "posted" : "pending_journal_approval",
          })
          .eq("id", paymentId);

        completed += 1;
        continue;
      }

      const attempts = (job.attempts ?? 0) + 1;
      const errMsg = !hasReceipt && !hasJournal
        ? "Missing receipt and journal"
        : !hasReceipt
        ? "Missing receipt"
        : "Missing journal";

      if (attempts >= MAX_ATTEMPTS) {
        await admin
          .from("platform_foe_pipeline_jobs")
          .update({ status: "failed", last_error: errMsg, processed_at: new Date().toISOString() })
          .eq("id", job.id);

        await admin.from("platform_work_queue_items").insert({
          queue_domain: "finance",
          kind: "foe_pipeline_failed",
          status: "open",
          title: "FOE pipeline incomplete",
          subtitle: `Payment ${paymentId.slice(0, 8)}… — ${errMsg}`,
          source_module: "CRM_AR",
          source_record_id: paymentId,
          link: `/accounting/finance-queue`,
          metadata: { payment_id: paymentId, last_error: errMsg },
        });

        failed += 1;
      } else {
        await admin
          .from("platform_foe_pipeline_jobs")
          .update({ status: "pending", last_error: errMsg })
          .eq("id", job.id);
      }
    }

    return json({ processed: (jobs ?? []).length, completed, failed });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
