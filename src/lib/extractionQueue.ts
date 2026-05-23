import { supabase } from "@/integrations/supabase/client";
import { priorityForType } from "@/lib/extractionConfig";

/**
 * Fire-and-forget: register a freshly uploaded document for background
 * OCR + field extraction. Safe to call after `client_documents` insert.
 *
 * - Writes a `client_document_extractions` row with status='queued'.
 * - Enqueues into `client_document_extraction_queue` with type-based priority.
 * - Appends a `document_classified` timeline event.
 *
 * Never throws — failures are logged but do not block the upload UX.
 */
export async function enqueueExtraction(opts: {
  documentId: string;
  clientId: string;
  personId?: string | null;
  docTypeDetected?: string | null;
  classifyConfidence?: number; // 0..1 from classifier
  source?: string | null;       // ai | filename | fallback
}): Promise<void> {
  const {
    documentId,
    clientId,
    personId = null,
    docTypeDetected = null,
    classifyConfidence = 0,
    source = null,
  } = opts;

  const confInt = Math.max(0, Math.min(100, Math.round((classifyConfidence ?? 0) * 100)));
  const priority = priorityForType(docTypeDetected);

  try {
    // Upsert by document_id (unique) so retries are idempotent.
    const { error: extErr } = await supabase
      .from("client_document_extractions")
      .upsert(
        {
          document_id: documentId,
          client_id: clientId,
          person_id: personId,
          doc_type_detected: docTypeDetected,
          classify_confidence: confInt,
          status: "queued",
        },
        { onConflict: "document_id" },
      );
    if (extErr) throw extErr;

    const { error: qErr } = await supabase
      .from("client_document_extraction_queue")
      .insert({
        document_id: documentId,
        client_id: clientId,
        priority,
        state: "queued",
      });
    if (qErr) throw qErr;

    // Best-effort timeline event.
    await supabase.from("client_timeline").insert({
      client_id: clientId,
      event_type: "document_classified",
      summary: docTypeDetected ? `Classified as ${docTypeDetected}` : "Document classified",
      metadata: {
        document_id: documentId,
        doc_type: docTypeDetected,
        confidence: confInt,
        source,
        priority,
      },
    });
  } catch (e) {
    console.warn("enqueueExtraction failed:", e);
  }
}