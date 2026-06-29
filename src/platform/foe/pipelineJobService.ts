/**
 * Server-side FOE pipeline job tracking — durable post-verify reconciliation.
 */
import { supabase } from "@/integrations/supabase/client";
import { getPaymentJournalForSource } from "@/accounting/lib/crmBridge";
import { receiptExistsForPayment } from "./receiptService";
import { retryMoneyInPipeline } from "./pipelineRetry";

export type PipelineJobStatus = "pending" | "processing" | "completed" | "failed";

export interface FoePipelineJob {
  id: string;
  jobType: string;
  paymentId: string;
  status: PipelineJobStatus;
  attempts: number;
  lastError: string | null;
  businessEventId: string | null;
  createdAt: string;
  processedAt: string | null;
}

export async function enqueueFoePipelineJob(input: {
  paymentId: string;
  businessEventId?: string | null;
  jobType?: string;
}): Promise<void> {
  try {
    await supabase.from("platform_foe_pipeline_jobs" as never).upsert(
      {
        job_type: input.jobType ?? "money_in_post_verify",
        payment_id: input.paymentId,
        business_event_id: input.businessEventId ?? null,
        status: "pending",
      } as never,
      { onConflict: "job_type,payment_id", ignoreDuplicates: true } as never,
    );
  } catch {
    /* table pending migration */
  }
}

function mapJob(row: Record<string, unknown>): FoePipelineJob {
  return {
    id: String(row.id),
    jobType: String(row.job_type ?? "money_in_post_verify"),
    paymentId: String(row.payment_id),
    status: row.status as PipelineJobStatus,
    attempts: Number(row.attempts ?? 0),
    lastError: (row.last_error as string) ?? null,
    businessEventId: (row.business_event_id as string) ?? null,
    createdAt: String(row.created_at),
    processedAt: (row.processed_at as string) ?? null,
  };
}

export async function getPipelineJobForPayment(paymentId: string): Promise<FoePipelineJob | null> {
  try {
    const { data } = await supabase
      .from("platform_foe_pipeline_jobs" as never)
      .select("*")
      .eq("payment_id", paymentId)
      .eq("job_type", "money_in_post_verify")
      .maybeSingle();
    if (data) return mapJob(data as Record<string, unknown>);
  } catch {
    /* fallback */
  }
  return null;
}

export async function listPendingPipelineJobs(limit = 50): Promise<FoePipelineJob[]> {
  try {
    const { data } = await supabase
      .from("platform_foe_pipeline_jobs" as never)
      .select("*")
      .in("status", ["pending", "failed"] as never)
      .order("created_at", { ascending: true })
      .limit(limit);
    return ((data ?? []) as Record<string, unknown>[]).map(mapJob);
  } catch {
    return [];
  }
}

/** Client-side reconciliation — retry incomplete pipelines and mark jobs complete. */
export async function reconcilePipelineJob(paymentId: string): Promise<{
  complete: boolean;
  retried: boolean;
}> {
  const hasReceipt = await receiptExistsForPayment(paymentId);
  const journal = await getPaymentJournalForSource(paymentId);
  if (hasReceipt && journal) {
    await markPipelineJobComplete(paymentId);
    return { complete: true, retried: false };
  }

  const retried = await retryMoneyInPipeline(paymentId);
  const hasReceiptAfter = await receiptExistsForPayment(paymentId);
  const journalAfter = await getPaymentJournalForSource(paymentId);
  if (hasReceiptAfter && journalAfter) {
    await markPipelineJobComplete(paymentId);
    return { complete: true, retried };
  }
  return { complete: false, retried };
}

export async function markPipelineJobComplete(paymentId: string): Promise<void> {
  try {
    await supabase
      .from("platform_foe_pipeline_jobs" as never)
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
        last_error: null,
      } as never)
      .eq("payment_id", paymentId)
      .eq("job_type", "money_in_post_verify");
  } catch {
    /* optional */
  }
}

export async function processPendingPipelineJobs(limit = 10): Promise<number> {
  const jobs = await listPendingPipelineJobs(limit);
  let processed = 0;
  for (const job of jobs) {
    const result = await reconcilePipelineJob(job.paymentId);
    if (result.complete) processed += 1;
  }
  return processed;
}
