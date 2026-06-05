import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { fetchMetaMedia, mediaStoragePath } from "./metaApi.ts";

export async function ensureWhatsAppMediaStored(
  admin: SupabaseClient,
  opts: {
    conversationId: string;
    providerMessageId: string | null;
    mediaProviderId: string;
    mediaMime: string | null;
    existingPath: string | null;
  },
): Promise<{ path: string | null; mime: string | null; error?: string }> {
  if (opts.existingPath) {
    return { path: opts.existingPath, mime: opts.mediaMime };
  }

  const downloaded = await fetchMetaMedia(opts.mediaProviderId);
  if (!downloaded) {
    return { path: null, mime: opts.mediaMime, error: "meta_fetch_failed" };
  }

  const path = mediaStoragePath(opts.conversationId, opts.providerMessageId, downloaded.mime);
  const blob = new Blob([downloaded.bytes], { type: downloaded.mime });
  const { error } = await admin.storage
    .from("whatsapp-media")
    .upload(path, blob, { contentType: downloaded.mime, upsert: true });

  if (error) {
    console.error("[mediaStorage] upload failed:", error.message);
    return { path: null, mime: downloaded.mime, error: error.message };
  }

  return { path, mime: downloaded.mime };
}
