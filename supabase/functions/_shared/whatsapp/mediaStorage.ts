import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { fetchMetaMedia, mediaStoragePath } from "./metaApi.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function ensureWhatsAppMediaStored(
  admin: SupabaseClient,
  opts: {
    conversationId: string;
    providerMessageId: string | null;
    mediaProviderId: string;
    mediaMime: string | null;
    existingPath: string | null;
  },
): Promise<{ path: string | null; mime: string | null; error?: string; hint?: string }> {
  if (opts.existingPath) {
    return { path: opts.existingPath, mime: opts.mediaMime };
  }

  let lastError = "meta_fetch_failed";
  let lastHint: string | undefined;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(400 * attempt);

    const downloaded = await fetchMetaMedia(opts.mediaProviderId);
    if (!downloaded.ok) {
      lastError = downloaded.error;
      if (downloaded.error === "meta_auth_failed") {
        lastHint = "Update WHATSAPP_ACCESS_TOKEN in Lovable secrets (Meta → WhatsApp → API Setup).";
      } else if (downloaded.error === "meta_media_expired") {
        lastHint = "Ask the client to resend the photo from WhatsApp.";
      }
      if (downloaded.error === "meta_auth_failed") break;
      continue;
    }

    const path = mediaStoragePath(opts.conversationId, opts.providerMessageId, downloaded.mime);
    const blob = new Blob([downloaded.bytes], { type: downloaded.mime });
    const { error } = await admin.storage
      .from("whatsapp-media")
      .upload(path, blob, { contentType: downloaded.mime, upsert: true });

    if (error) {
      console.error("[mediaStorage] upload failed:", error.message);
      return { path: null, mime: downloaded.mime, error: "storage_upload_failed", hint: error.message };
    }

    return { path, mime: downloaded.mime };
  }

  return { path: null, mime: opts.mediaMime, error: lastError, hint: lastHint };
}
