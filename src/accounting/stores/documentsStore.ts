import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { MockDocument } from "../data/mockDocuments";
import { runWhenAuthReady } from "./_hydrationGate";

// Persisted to Supabase: metadata + extracted OCR data live in the
// `accounting_documents` table; the original file bytes live in the private
// `accounting-documents` storage bucket. We no longer rely on localStorage
// (the previous implementation lost files on refresh and never synced).

const BUCKET = "accounting-documents";

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string | null | undefined) => !!v && UUID_RX.test(v);
function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(16)}-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─── In-memory state ────────────────────────────────────────────────────────
let documents: MockDocument[] = [];

// Original File blobs for the current session (used for re-extraction). These
// are also uploaded to storage; this map is just a fast local cache so we don't
// re-download right after upload. Lost on refresh — re-download from storage
// happens lazily via getDocumentFileAsync when needed.
const fileBlobs = new Map<string, File>();
// Maps document id -> storage path, so we can fetch/remove the file later.
const storagePaths = new Map<string, string>();

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

// ─── DB mapping ──────────────────────────────────────────────────────────────
function mapToDb(d: MockDocument): Record<string, unknown> {
  return {
    id: d.id,
    filename: d.filename,
    file_type: d.fileType,
    file_size_kb: d.fileSizeKB ?? 0,
    storage_path: storagePaths.get(d.id) ?? null,
    doc_type: d.docType,
    ocr_status: d.ocrStatus,
    approval_status: d.approvalStatus,
    entity: d.entity ?? null,
    uploaded_by: d.uploadedBy ?? null,
    uploaded_at: d.uploadedAt ?? new Date().toISOString(),
    linked_journal_id: isUuid(d.linkedJournalId) ? d.linkedJournalId : null,
    linked_vendor: d.linkedVendor ?? null,
    linked_client: d.linkedClient ?? null,
    tags: d.tags ?? [],
    extracted: d.extracted ?? null,
    line_items: d.lineItems ?? null,
    ocr_error: d.ocrError ?? null,
  };
}

function mapFromDb(row: any): MockDocument {
  if (row.storage_path) storagePaths.set(row.id, row.storage_path);
  return {
    id: row.id,
    filename: row.filename ?? "",
    fileType: (row.file_type ?? "pdf") as MockDocument["fileType"],
    fileSizeKB: Number(row.file_size_kb ?? 0),
    docType: (row.doc_type ?? "OTHER") as MockDocument["docType"],
    ocrStatus: (row.ocr_status ?? "PENDING") as MockDocument["ocrStatus"],
    approvalStatus: (row.approval_status ?? "PENDING") as MockDocument["approvalStatus"],
    entity: row.entity ?? "",
    uploadedBy: row.uploaded_by ?? "",
    uploadedAt: row.uploaded_at ?? new Date().toISOString(),
    linkedJournalId: row.linked_journal_id ?? undefined,
    linkedVendor: row.linked_vendor ?? undefined,
    linkedClient: row.linked_client ?? undefined,
    tags: row.tags ?? [],
    extracted: row.extracted ?? undefined,
    lineItems: row.line_items ?? undefined,
    ocrError: row.ocr_error ?? undefined,
  };
}

// ─── Hydrate ──────────────────────────────────────────────────────────────────
async function hydrateFromSupabase() {
  try {
    const { data, error } = await supabase
      .from("accounting_documents")
      .select("*")
      .order("uploaded_at", { ascending: false });
    if (error) throw error;
    documents = (data ?? []).map(mapFromDb);
    emit();
  } catch (e) {
    console.warn("[documentsStore] hydrate failed", e);
  }
}
runWhenAuthReady(hydrateFromSupabase);

// ─── Public API (unchanged signatures) ───────────────────────────────────────
export const useDocuments = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => documents,
    () => documents,
  );
export const getDocuments = () => documents;
export const getDocument = (id: string) => documents.find((d) => d.id === id);

export function addDocument(input: Omit<MockDocument, "id">, file?: File): MockDocument {
  const created: MockDocument = {
    id: newUuid(),
    ...input,
    tags: input.tags ?? [],
  };
  if (file) fileBlobs.set(created.id, file);

  // Optimistic: show immediately.
  documents = [created, ...documents];
  emit();

  void (async () => {
    let uploadedPath: string | null = null;
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id ?? null;

      // 1. Upload the file (if any) to storage first, so we can store its path.
      if (file) {
        const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
        const path = `${uid ?? "anon"}/${created.id}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: true });
        if (upErr) throw upErr;
        uploadedPath = path;
        storagePaths.set(created.id, path);
      }

      // 2. Insert the metadata row.
      const { error } = await supabase
        .from("accounting_documents")
        .insert({ ...mapToDb(created), created_by: uid } as any);
      if (error) throw error;
    } catch (e: any) {
      if (uploadedPath) {
        // Best-effort cleanup: avoid orphaning bytes when metadata insert fails.
        await supabase.storage.from(BUCKET).remove([uploadedPath]).catch(() => {});
      }
      console.warn("[documentsStore] save failed", e);
      // Roll back the optimistic insert.
      documents = documents.filter((d) => d.id !== created.id);
      fileBlobs.delete(created.id);
      storagePaths.delete(created.id);
      emit();
      toast.error(`Failed to save document: ${e?.message ?? "unknown error"}`);
    }
  })();

  return created;
}

export function updateDocument(id: string, patch: Partial<MockDocument>) {
  const prev = documents.find((d) => d.id === id);
  if (!prev) return;
  const next = { ...prev, ...patch };
  documents = documents.map((d) => (d.id === id ? next : d));
  emit();
  if (!isUuid(id)) return;
  void (async () => {
    try {
      const { error } = await supabase
        .from("accounting_documents")
        .update(mapToDb(next) as any)
        .eq("id", id);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[documentsStore] update failed", e);
      documents = documents.map((d) => (d.id === id ? prev : d));
      emit();
      toast.error(`Failed to update document: ${e?.message ?? "unknown error"}`);
    }
  })();
}

export function deleteDocument(id: string) {
  const prev = documents;
  const path = storagePaths.get(id);
  documents = documents.filter((d) => d.id !== id);
  fileBlobs.delete(id);
  emit();
  if (!isUuid(id)) {
    storagePaths.delete(id);
    return;
  }
  void (async () => {
    try {
      const { error } = await supabase.from("accounting_documents").delete().eq("id", id);
      if (error) throw error;
      if (path)
        await supabase.storage
          .from(BUCKET)
          .remove([path])
          .catch(() => {});
      storagePaths.delete(id);
    } catch (e: any) {
      console.warn("[documentsStore] delete failed", e);
      documents = prev;
      emit();
      toast.error(`Failed to delete document: ${e?.message ?? "unknown error"}`);
    }
  })();
}

// Synchronous accessor — returns the in-session blob if we still have it.
export function getDocumentFile(id: string): File | undefined {
  return fileBlobs.get(id);
}

export function hasDocumentFile(id: string): boolean {
  return fileBlobs.has(id) || storagePaths.has(id);
}

// Async accessor — fetches the file from storage if it isn't in the session
// cache (e.g. after a refresh). Lets pages re-extract without re-uploading.
export async function getDocumentFileAsync(id: string): Promise<File | undefined> {
  const cached = fileBlobs.get(id);
  if (cached) return cached;
  const path = storagePaths.get(id);
  if (!path) return undefined;
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) return undefined;
    const name = path.split("/").pop() ?? "document";
    const file = new File([data], name, { type: data.type });
    fileBlobs.set(id, file);
    return file;
  } catch (e) {
    console.warn("[documentsStore] file download failed", e);
    return undefined;
  }
}
