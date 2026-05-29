// @ts-nocheck
// process-notification-email-queue
//
// Drains the `notification_emails` pgmq queue and delivers each message
// via the existing smtp-send edge function (customer SMTP credentials,
// entity SMTP routing, app_email_logs). Never calls sendLovableEmail or
// the Lovable email API.
//
// Triggered by pg_cron every minute (verify_jwt=false — cron uses anon key).
//
// Key design guarantees:
//  1. Idempotency  — checks app_email_logs metadata for message_id='sent'
//                    before every send attempt; skips duplicates.
//  2. VT safety    — pgmq visibility timeout (VT=30s) ensures only one
//                    concurrent worker processes a given message.
//  3. DLQ          — messages exceeding MAX_RETRIES or TTL are moved to
//                    notification_emails_dlq and logged.
//  4. app_email_logs compatibility — writes identical columns to what
//                    smtp-send writes so Email Logs page is unaffected.
//  5. Flag respect — QUEUE_EMAILS env var is checked; if false/unset the
//                    worker exits immediately (no-op) because dispatch
//                    would not have enqueued anything.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const QUEUE_NAME     = "notification_emails";
const DLQ_NAME       = "notification_emails_dlq";
const MAX_RETRIES    = 3;
const VT_SECONDS     = 30;   // visibility timeout — matches process-email-queue
const BATCH_SIZE     = 10;
const TTL_MINUTES    = 60;
const SEND_DELAY_MS  = 200;  // small inter-send pause to smooth SMTP bursts

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ── Helpers ────────────────────────────────────────────────────────────────

async function moveToDlq(
  admin: ReturnType<typeof createClient>,
  msg: { msg_id: number; message: Record<string, unknown> },
  reason: string,
): Promise<void> {
  const payload   = msg.message;
  const messageId = payload.message_id as string | null ?? null;
  const to        = payload.to         as string | null ?? null;
  const label     = payload.label      as string | null ?? QUEUE_NAME;

  console.warn("[notification-email-debug] moved_to_dlq", {
    msg_id:     msg.msg_id,
    message_id: messageId,
    to,
    reason,
  });

  // Write to app_email_logs so the Email Logs page shows the failure
  await admin.from("app_email_logs").insert({
    recipient:     to ?? "unknown",
    subject:       (payload.subject as string | null) ?? "(no subject)",
    body_html:     (payload.html    as string | null) ?? null,
    body_text:     null,
    category:      (payload.category as string | null) ?? label,
    status:        "failed",
    error_message: reason,
    attempts:      MAX_RETRIES,
    triggered_by:  (payload.actor_user_id as string | null) ?? null,
    metadata: {
      message_id: messageId,
      queue:      QUEUE_NAME,
      dlq:        true,
      event_type: (payload.event_type as string | null) ?? null,
      client_id:  (payload.client_id  as string | null) ?? null,
    },
  });

  // Move in pgmq
  const { error } = await admin.rpc("move_to_dlq", {
    source_queue: QUEUE_NAME,
    dlq_name:     DLQ_NAME,
    message_id:   msg.msg_id,
    payload,
  });
  if (error) {
    console.error("[notification-email-debug] moved_to_dlq", {
      msg_id: msg.msg_id,
      error:  error.message,
      note:   "rpc_failed_but_logged_to_app_email_logs",
    });
  }
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // QUEUE_EMAILS flag guard — if not enabled, this worker is a no-op.
  // notifications-dispatch only enqueues when QUEUE_EMAILS=true so this
  // queue will always be empty in the fallback case, but we check anyway
  // for safety.
  const queueEnabled = Deno.env.get("QUEUE_EMAILS") === "true";
  if (!queueEnabled) {
    console.info("[notification-email-debug] worker_skipped", {
      reason: "QUEUE_EMAILS_not_true",
    });
    return json({ skipped: true, reason: "QUEUE_EMAILS not enabled" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!supabaseUrl || !serviceKey) {
    console.error("[notification-email-debug] worker_error", {
      reason: "missing_env_vars",
    });
    return json({ error: "Server configuration error" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ── Read batch from queue ────────────────────────────────────────────────
  const { data: messages, error: readError } = await admin.rpc("read_email_batch", {
    queue_name:  QUEUE_NAME,
    batch_size:  BATCH_SIZE,
    vt:          VT_SECONDS,
  });

  if (readError) {
    console.error("[notification-email-debug] worker_error", {
      reason: "queue_read_failed",
      error:  readError.message,
    });
    return json({ error: "Queue read failed" }, 500);
  }

  const batchCount = messages?.length ?? 0;

  console.info("[notification-email-debug] worker_received", {
    queue_depth: batchCount,
    batch_size:  BATCH_SIZE,
    queue:       QUEUE_NAME,
  });

  if (!batchCount) {
    return json({ processed: 0, queue_depth: 0 });
  }

  let processed = 0;
  let dlqCount  = 0;
  let skipCount = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg       = messages[i];
    const payload   = msg.message as Record<string, unknown>;
    const messageId = payload.message_id as string | null ?? null;
    const to        = payload.to         as string | null ?? null;

    if (!to) {
      console.warn("[notification-email-debug] moved_to_dlq", {
        msg_id: msg.msg_id,
        reason: "missing_to_field",
      });
      await moveToDlq(admin, msg, "Payload missing 'to' field");
      dlqCount++;
      continue;
    }

    // ── TTL check ──────────────────────────────────────────────────────────
    const queuedAt = (payload.queued_at as string | null) ?? (msg.enqueued_at as string | null);
    if (queuedAt) {
      const ageMs    = Date.now() - new Date(queuedAt).getTime();
      const maxAgeMs = TTL_MINUTES * 60 * 1000;
      if (ageMs > maxAgeMs) {
        console.warn("[notification-email-debug] moved_to_dlq", {
          msg_id:     msg.msg_id,
          message_id: messageId,
          to,
          reason:     `TTL_exceeded_${TTL_MINUTES}_min`,
          age_min:    Math.round(ageMs / 60000),
        });
        await moveToDlq(admin, msg, `TTL exceeded (${TTL_MINUTES} minutes)`);
        dlqCount++;
        continue;
      }
    }

    // ── Idempotency: already sent? ─────────────────────────────────────────
    // Check app_email_logs for a prior successful send with this message_id.
    // This covers the crash-after-send-before-delete scenario.
    if (messageId) {
      const { data: alreadySent } = await admin
        .from("app_email_logs")
        .select("id")
        .eq("status", "sent")
        .contains("metadata", { message_id: messageId })
        .maybeSingle();

      if (alreadySent) {
        console.info("[notification-email-debug] worker_received", {
          msg_id:     msg.msg_id,
          message_id: messageId,
          to,
          note:       "duplicate_skipped_already_sent",
        });
        // Delete from queue — it was already delivered
        await admin.rpc("delete_email", {
          queue_name: QUEUE_NAME,
          message_id: msg.msg_id,
        });
        skipCount++;
        continue;
      }
    }

    // ── Retry count check ──────────────────────────────────────────────────
    // Count prior failed attempts in app_email_logs for this message_id.
    let failedAttempts = 0;
    if (messageId) {
      const { count } = await admin
        .from("app_email_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .contains("metadata", { message_id: messageId });
      failedAttempts = count ?? 0;
    }

    console.info("[notification-email-debug] worker_received", {
      msg_id:      msg.msg_id,
      message_id:  messageId,
      to,
      retry_count: failedAttempts,
      dlq_count:   dlqCount,
      queue_depth: batchCount,
    });

    if (failedAttempts >= MAX_RETRIES) {
      await moveToDlq(
        admin,
        msg,
        `Max retries (${MAX_RETRIES}) exceeded (attempted ${failedAttempts} times)`,
      );
      dlqCount++;
      continue;
    }

    // ── Send via smtp-send ─────────────────────────────────────────────────
    console.info("[notification-email-debug] smtp_send_start", {
      msg_id:     msg.msg_id,
      message_id: messageId,
      to,
      subject:    (payload.subject as string | null)?.slice(0, 80),
      category:   payload.category,
      retry:      failedAttempts,
    });

    try {
      // Use service-role key as Bearer token so smtp-send can authenticate.
      // smtp-send validates the JWT and resolves the triggering user;
      // service-role passes that check.
      const smtpRes = await fetch(`${supabaseUrl}/functions/v1/smtp-send`, {
        method:  "POST",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          to,
          subject:   payload.subject   ?? "",
          html:      payload.html      ?? "",
          category:  payload.category  ?? `notif:${payload.event_type ?? "unknown"}`,
          entity_id: payload.entity_id ?? null,
        }),
      });

      const smtpBody = await smtpRes.json().catch(() => ({}));
      const logId    = (smtpBody as any)?.log_id ?? null;

      if (smtpRes.ok) {
        console.info("[notification-email-debug] smtp_send_success", {
          msg_id:     msg.msg_id,
          message_id: messageId,
          to,
          log_id:     logId,
        });

        // Stamp our message_id into the app_email_logs row that smtp-send
        // already wrote, so the idempotency check above can find it on a
        // crash-retry. smtp-send wrote the row; we update metadata only.
        if (logId && messageId) {
          await admin
            .from("app_email_logs")
            .update({
              metadata: {
                message_id: messageId,
                queue:      QUEUE_NAME,
                event_type: (payload.event_type as string | null) ?? null,
                client_id:  (payload.client_id  as string | null) ?? null,
              },
            })
            .eq("id", logId);
        }

        // Write client timeline entry (best-effort — never throws)
        const clientId    = payload.client_id    as string | null ?? null;
        const actorUserId = payload.actor_user_id as string | null ?? null;
        const eventType   = payload.event_type    as string | null ?? "notification";
        if (clientId && actorUserId) {
          admin.from("client_timeline").insert({
            client_id:  clientId,
            event_type: `notification.${eventType}`,
            actor_id:   actorUserId,
            summary:    `Email sent to ${to} (queued delivery)`,
            metadata: {
              message_id: messageId,
              queue:      QUEUE_NAME,
              log_id:     logId,
            },
          }).then(() => {}).catch(() => {});
        }

        // Delete from queue — message fully processed
        const { error: delErr } = await admin.rpc("delete_email", {
          queue_name: QUEUE_NAME,
          message_id: msg.msg_id,
        });
        if (delErr) {
          console.error("[notification-email-debug] smtp_send_success", {
            msg_id: msg.msg_id,
            note:   "delete_from_queue_failed_but_message_sent",
            error:  delErr.message,
          });
          // Not fatal — VT will expire and the idempotency check will skip it
        }

        processed++;
      } else {
        // smtp-send returned non-2xx (SMTP error, config problem, etc.)
        const errMsg = (smtpBody as any)?.error ?? `smtp-send HTTP ${smtpRes.status}`;
        const eventType = payload.event_type as string | null ?? "unknown";

        console.error("[notification-email-debug] smtp_send_failed", {
          msg_id:      msg.msg_id,
          message_id:  messageId,
          to,
          status:      smtpRes.status,
          error:       errMsg,
          retry_count: failedAttempts + 1,
        });

        // Log the failure to app_email_logs so the Email Logs page shows it.
        // smtp-send may have already written a 'failed' row for the SMTP
        // error itself; this row tracks the queue-level retry count.
        await admin.from("app_email_logs").insert({
          recipient:     to,
          subject:       (payload.subject  as string | null) ?? "(no subject)",
          body_html:     (payload.html     as string | null) ?? null,
          body_text:     null,
          category:      (payload.category as string | null) ?? `notif:${eventType}`,
          status:        "failed",
          error_message: errMsg,
          attempts:      failedAttempts + 1,
          triggered_by:  (payload.actor_user_id as string | null) ?? null,
          metadata: {
            message_id:  messageId,
            queue:       QUEUE_NAME,
            event_type:  eventType,
            client_id:   (payload.client_id as string | null) ?? null,
            smtp_status: smtpRes.status,
          },
        });

        // Message stays invisible (VT=30s) then is retried next cron tick.
        // If this was the last retry, moveToDlq fires on the next pass.
      }
    } catch (e) {
      const errMsg    = e instanceof Error ? e.message : String(e);
      const eventType = payload.event_type as string | null ?? "unknown";

      console.error("[notification-email-debug] smtp_send_failed", {
        msg_id:      msg.msg_id,
        message_id:  messageId,
        to,
        error:       errMsg,
        retry_count: failedAttempts + 1,
        note:        "fetch_exception",
      });

      await admin.from("app_email_logs").insert({
        recipient:     to,
        subject:       (payload.subject  as string | null) ?? "(no subject)",
        body_html:     (payload.html     as string | null) ?? null,
        body_text:     null,
        category:      (payload.category as string | null) ?? QUEUE_NAME,
        status:        "failed",
        error_message: errMsg,
        attempts:      failedAttempts + 1,
        triggered_by:  (payload.actor_user_id as string | null) ?? null,
        metadata: {
          message_id: messageId,
          queue:      QUEUE_NAME,
          event_type: eventType,
          client_id:  (payload.client_id as string | null) ?? null,
          exception:  true,
        },
      });
    }

    // Small delay between sends to avoid SMTP burst issues
    if (i < messages.length - 1) {
      await new Promise((r) => setTimeout(r, SEND_DELAY_MS));
    }
  }

  console.info("[notification-email-debug] worker_received", {
    queue_depth:  batchCount,
    processed,
    skipped:      skipCount,
    dlq_count:    dlqCount,
    retry_count:  batchCount - processed - skipCount - dlqCount,
    queue:        QUEUE_NAME,
  });

  return json({ processed, skipped: skipCount, dlq_count: dlqCount, queue_depth: batchCount });
});