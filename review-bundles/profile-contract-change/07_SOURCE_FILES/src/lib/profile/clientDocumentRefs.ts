import { supabase } from "@/integrations/supabase/client";
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
): Promise<void> {
  const { data: existing, error: fetchErr } = await supabase
    .from("client_document_refs")
    .select("id, document_id, slot")
    .eq("client_id", clientId)
    .eq("ref_key", refKey);
  if (fetchErr) throw fetchErr;

  const desired = new Set(linked.map((d) => `${d.document_id}::${d.slot}`));
  const toDelete = (existing ?? []).filter((r) => !desired.has(`${r.document_id}::${r.slot}`));

  for (const row of toDelete) {
    await deleteDocumentRef(clientId, row.document_id as string, refKey, row.slot as string);
  }

  for (const doc of linked) {
    await upsertDocumentRef({
      client_id: clientId,
      document_id: doc.document_id,
      ref_key: refKey,
      slot: doc.slot,
      label: doc.label,
    });
  }
}

export async function syncAllProfileDocumentRefs(
  clientId: string,
  entries: { ref_key: string; linked_documents: LinkedDocSyncItem[] }[],
): Promise<void> {
  for (const entry of entries) {
    await syncDocumentRefsForKey(clientId, entry.ref_key, entry.linked_documents);
  }
}
