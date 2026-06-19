import { supabase } from "@/integrations/supabase/client";
import { isDocumentRefsUnavailableError } from "@/lib/profile/profileSaveError";
import type { ClientDocumentRefRow } from "@/lib/profile/types";
import { slotLabel } from "@/lib/profile/profileDocumentSlots";

export interface ClientDocumentRefInsert {
  client_id: string;
  document_id: string;
  ref_key: string;
  slot: string;
  label?: string | null;
}

export async function listDocumentRefsForClient(clientId: string): Promise<ClientDocumentRefRow[]> {
  const { data, error } = await supabase
    .from("client_document_refs")
    .select(
      `
      id,
      client_id,
      document_id,
      ref_key,
      slot,
      label,
      linked_at,
      client_documents ( file_name )
    `,
    )
    .eq("client_id", clientId)
    .order("linked_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const doc = row.client_documents as { file_name?: string | null } | null;
    return {
      id: row.id as string,
      client_id: row.client_id as string,
      document_id: row.document_id as string,
      ref_key: row.ref_key as string,
      slot: row.slot as string,
      label: (row.label as string | null) ?? slotLabel(row.slot as string),
      linked_at: row.linked_at as string,
      file_name: doc?.file_name ?? null,
    };
  });
}

export async function upsertDocumentRef(input: ClientDocumentRefInsert): Promise<void> {
  const { error } = await supabase.from("client_document_refs").upsert(
    {
      client_id: input.client_id,
      document_id: input.document_id,
      ref_key: input.ref_key,
      slot: input.slot,
      label: input.label ?? slotLabel(input.slot),
    },
    { onConflict: "client_id,document_id,ref_key,slot" },
  );
  if (error) throw error;
}

export async function deleteDocumentRef(
  clientId: string,
  documentId: string,
  refKey: string,
  slot: string,
): Promise<void> {
  const { error } = await supabase
    .from("client_document_refs")
    .delete()
    .eq("client_id", clientId)
    .eq("document_id", documentId)
    .eq("ref_key", refKey)
    .eq("slot", slot);
  if (error) throw error;
}

export interface LinkedDocSyncItem {
  document_id: string;
  slot: string;
  label: string;
  linked_at?: string | null;
}

/** Replace ref rows for a ref_key to match linked_documents[] on save. */
export async function syncDocumentRefsForKey(
  clientId: string,
  refKey: string,
  linked: LinkedDocSyncItem[],
  existingForKey?: { id: string; document_id: string; slot: string }[],
): Promise<void> {
  let existing = existingForKey;
  if (!existing) {
    const { data, error: fetchErr } = await supabase
      .from("client_document_refs")
      .select("id, document_id, slot")
      .eq("client_id", clientId)
      .eq("ref_key", refKey);
    if (fetchErr) throw fetchErr;
    existing = (data ?? []) as { id: string; document_id: string; slot: string }[];
  }

  const desired = new Set(linked.map((d) => `${d.document_id}::${d.slot}`));
  const toDelete = existing.filter((r) => !desired.has(`${r.document_id}::${r.slot}`));

  if (toDelete.length > 0) {
    const ids = toDelete.map((r) => r.id);
    const { error: delErr } = await supabase.from("client_document_refs").delete().in("id", ids);
    if (delErr) throw delErr;
  }

  if (linked.length > 0) {
    const { error: upsertErr } = await supabase.from("client_document_refs").upsert(
      linked.map((doc) => ({
        client_id: clientId,
        document_id: doc.document_id,
        ref_key: refKey,
        slot: doc.slot,
        label: doc.label ?? slotLabel(doc.slot),
      })),
      { onConflict: "client_id,document_id,ref_key,slot" },
    );
    if (upsertErr) throw upsertErr;
  }
}

async function listRefRowsForClient(
  clientId: string,
): Promise<{ id: string; ref_key: string; document_id: string; slot: string }[]> {
  const { data, error } = await supabase
    .from("client_document_refs")
    .select("id, ref_key, document_id, slot")
    .eq("client_id", clientId);
  if (error) throw error;
  return (data ?? []) as { id: string; ref_key: string; document_id: string; slot: string }[];
}

export async function syncAllProfileDocumentRefs(
  clientId: string,
  entries: { ref_key: string; linked_documents: LinkedDocSyncItem[] }[],
): Promise<void> {
  if (entries.length === 0) return;

  const targetKeys = new Set(entries.map((e) => e.ref_key));
  const allRows = await listRefRowsForClient(clientId);
  const byKey = new Map<string, { id: string; document_id: string; slot: string }[]>();
  for (const row of allRows) {
    if (!targetKeys.has(row.ref_key)) continue;
    const list = byKey.get(row.ref_key) ?? [];
    list.push({ id: row.id, document_id: row.document_id, slot: row.slot });
    byKey.set(row.ref_key, list);
  }

  const allEmpty = entries.every((e) => e.linked_documents.length === 0);
  if (allEmpty && byKey.size === 0) return;

  await Promise.all(
    entries.map((entry) =>
      syncDocumentRefsForKey(clientId, entry.ref_key, entry.linked_documents, byKey.get(entry.ref_key)),
    ),
  );
}

/**
 * Sync document refs when the table exists; skip gracefully when migration is not published.
 * Returns false when skipped (clients JSON still saved).
 */
export async function syncAllProfileDocumentRefsIfAvailable(
  clientId: string,
  entries: { ref_key: string; linked_documents: LinkedDocSyncItem[] }[],
): Promise<{ synced: boolean; skippedReason?: string }> {
  if (entries.length === 0) return { synced: true };

  const allEmpty = entries.every((e) => e.linked_documents.length === 0);
  if (allEmpty) {
    const targetKeys = entries.map((e) => e.ref_key);
    const { data, error: probeErr } = await supabase
      .from("client_document_refs")
      .select("id")
      .eq("client_id", clientId)
      .in("ref_key", targetKeys)
      .limit(1);

    if (probeErr) {
      if (isDocumentRefsUnavailableError(probeErr)) {
        console.warn(
          "[profileSave] client_document_refs unavailable — profile JSON saved, doc links skipped.",
          probeErr,
        );
        return { synced: false, skippedReason: "client_document_refs table not available" };
      }
      throw probeErr;
    }
    if (!data?.length) return { synced: true };
  }

  const { error: probeErr } = await supabase
    .from("client_document_refs")
    .select("id")
    .eq("client_id", clientId)
    .limit(1);

  if (probeErr) {
    if (isDocumentRefsUnavailableError(probeErr)) {
      console.warn(
        "[profileSave] client_document_refs unavailable — profile JSON saved, doc links skipped.",
        probeErr,
      );
      return { synced: false, skippedReason: "client_document_refs table not available" };
    }
    throw probeErr;
  }

  await syncAllProfileDocumentRefs(clientId, entries);
  return { synced: true };
}
