/** Workflow attachments — excluded from Documents & Statutory (HR master docs only). */
export const WORKFLOW_DOCUMENT_TYPES = new Set([
  "Leave Supporting Document",
  "Comp-Off Supporting Document",
  "Attendance Exception Evidence",
  "Comp-Off Evidence",
  "Incident Evidence",
  "Mispunch Evidence",
]);

export function isHrStatutoryDocument(docType: string): boolean {
  return !WORKFLOW_DOCUMENT_TYPES.has(docType);
}

export function filterHrStatutoryDocuments<T extends { doc_type: string }>(docs: T[]): T[] {
  return docs.filter((d) => isHrStatutoryDocument(d.doc_type));
}
