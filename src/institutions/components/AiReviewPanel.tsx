import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  document: any | null;
  institutionId: string;
  onChanged: () => void;
}

const DOC_KINDS = [
  "program_sheet", "agreement", "commission_sheet", "brochure",
  "promotion_campaign", "invoice_template", "renewal_document", "other",
] as const;

export function AiReviewPanel({ open, onOpenChange, document: docProp, institutionId, onChanged }: Props) {
  const [doc, setDoc] = useState<any | null>(docProp);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [downloadUrl, setDownloadUrl] = useState<string>("");
  const [editedPayload, setEditedPayload] = useState<string>("");
  const [docKind, setDocKind] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);

  const prettyName = (n?: string) => {
    if (!n) return "";
    try { return decodeURIComponent(n.replace(/\+/g, " ")); } catch { return n.replace(/%20/g, " "); }
  };

  useEffect(() => {
    if (!docProp) { setDoc(null); return; }
    setDoc(docProp);
    setPreviewFailed(false);
    setPreviewUrl("");
    setDownloadUrl("");
    setCourses([]);
    let revokeUrl: string | null = null;
    let cancelled = false;
    // Re-fetch the latest row so confidence / pipeline_status reflect the post-orchestrator state
    supabase
      .from("upi_uploaded_documents")
      .select("*")
      .eq("id", docProp.id)
      .single()
      .then(async ({ data }) => {
        const fresh = data ?? docProp;
        if (cancelled) return;
        setDoc(fresh);
        setEditedPayload(JSON.stringify(fresh.extracted_payload ?? {}, null, 2));
        setDocKind(fresh.metadata?.doc_kind ?? "");
        // Load any program rows extracted from this document so the reviewer
        // can see real course data, not just the orchestrator's summary JSON.
        supabase
          .from("upi_courses_staging")
          .select("id, course_title, program_level_id, duration_value, duration_unit, tuition_fee, currency, intake_months, city, campus_name, confidence_score, metadata")
          .eq("institution_id", institutionId)
          .filter("metadata->>source_document_id", "eq", fresh.id)
          .order("created_at", { ascending: false })
          .limit(100)
          .then(({ data: rows }) => { if (!cancelled) setCourses(rows ?? []); });
        if (!fresh.file_path) return;
        // Signed URL for the "Open in new tab" / "Download" fallback.
        supabase.storage
          .from("institution-documents")
          .createSignedUrl(fresh.file_path, 600)
          .then(({ data: sig }) => { if (!cancelled) setDownloadUrl(sig?.signedUrl ?? ""); });
        // Download as blob and render via object URL — Chrome blocks many
        // cross-origin signed PDF URLs inside <iframe>, but blob: URLs render fine.
        const { data: file, error } = await supabase.storage
          .from("institution-documents")
          .download(fresh.file_path);
        if (cancelled || error || !file) return;
        const buf = await file.arrayBuffer();
        if (cancelled || buf.byteLength === 0) return;
        const mime = fresh.mime_type || "application/pdf";
        const url = URL.createObjectURL(new Blob([buf], { type: mime }));
        revokeUrl = url;
        setPreviewUrl(url);
      });
    return () => {
      cancelled = true;
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);
    };
  }, [docProp]);

  // If the iframe doesn't load within a few seconds, show fallback download/open links.
  useEffect(() => {
    if (!previewUrl) return;
    setPreviewFailed(false);
    const t = setTimeout(() => setPreviewFailed(true), 5000);
    return () => clearTimeout(t);
  }, [previewUrl]);

  if (!doc) return null;

  const setStatus = async (status: "approved" | "rejected" | "needs_review") => {
    setBusy(true);
    let parsed: any = {};
    try {
      parsed = JSON.parse(editedPayload);
    } catch {
      toast.error("Extracted JSON is invalid");
      setBusy(false);
      return;
    }
    const { error } = await supabase
      .from("upi_uploaded_documents")
      .update({ pipeline_status: status, extracted_payload: parsed, review_status: status })
      .eq("id", doc.id);
    await supabase.from("upi_document_pipeline_events").insert({
      document_id: doc.id, state: status, message: `Reviewer set status: ${status}`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    onChanged();
    onOpenChange(false);
  };

  const reprocess = async () => {
    setBusy(true);
    const kind = docKind || doc.metadata?.doc_kind || "brochure";
    // Persist the (possibly changed) doc_kind so downstream routing is correct on next runs too
    if (kind !== doc.metadata?.doc_kind) {
      await supabase
        .from("upi_uploaded_documents")
        .update({ metadata: { ...(doc.metadata ?? {}), doc_kind: kind } })
        .eq("id", doc.id);
    }
    const { error } = await supabase.functions.invoke("upi-document-orchestrator", {
      body: { document_id: doc.id, institution_id: institutionId, doc_kind: kind },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Reprocessing started"); onChanged(); }
  };

  const payloadIsEmpty = (() => {
    try { const p = JSON.parse(editedPayload); return !p || (typeof p === "object" && Object.keys(p).length === 0); }
    catch { return false; }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="truncate">{prettyName(doc.file_name)}</span>
            <Badge variant="outline">{doc.pipeline_status ?? doc.review_status}</Badge>
            <Badge>{doc.confidence_score ?? 0}% confidence</Badge>
          </DialogTitle>
        </DialogHeader>
        {(() => {
          const meta = (doc.metadata?.extraction_meta) as any | undefined;
          if (!meta) return null;
          const cov = meta.pageCount ? `${meta.pagesSucceeded}/${meta.pageCount}` : "—";
          const incomplete = meta.pageCount && meta.pagesSucceeded / meta.pageCount < 0.8;
          const failed = Array.isArray(meta.pagesFailed) ? meta.pagesFailed : [];
          return (
            <div className={`-mt-2 mb-2 rounded border px-3 py-2 text-xs flex flex-wrap items-center gap-x-4 gap-y-1 ${incomplete ? "border-amber-500/50 bg-amber-500/10" : "bg-muted/30"}`}>
              <span>Pages <b>{cov}</b></span>
              <span>Programs <b>{meta.programsFound ?? 0}</b> ({meta.programsUpserted ?? 0} staged)</span>
              {typeof meta.nonProgramSkipped === "number" && meta.nonProgramSkipped > 0 && (
                <span>Skipped non-program items <b>{meta.nonProgramSkipped}</b></span>
              )}
              {meta.docKind && <span>Mode <b>{String(meta.docKind)}</b></span>}
              {typeof meta.runMs === "number" && <span>Run <b>{Math.round(meta.runMs/1000)}s</b></span>}
              {failed.length > 0 && <span className="text-amber-700 dark:text-amber-400">Failed pages: {failed.slice(0,10).join(", ")}{failed.length>10 ? "…" : ""}</span>}
              {incomplete && <span className="font-semibold text-amber-700 dark:text-amber-400">Incomplete extraction — re-run recommended</span>}
            </div>
          );
        })()}
        <div className="flex items-center gap-2 -mt-2 mb-2">
          <label className="text-xs text-muted-foreground">Document type</label>
          <Select value={docKind} onValueChange={setDocKind}>
            <SelectTrigger className="h-8 w-64"><SelectValue placeholder="Pick a document type…" /></SelectTrigger>
            <SelectContent>
              {DOC_KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">Change and click Reprocess to re-route this file.</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh]">
          <div className="border rounded overflow-hidden bg-muted/30 min-h-[50vh]">
            {previewUrl ? (
              <div className="relative w-full h-[70vh]">
                <iframe
                  src={previewUrl}
                  className="w-full h-full"
                  title="Document preview"
                  onLoad={() => setPreviewFailed(false)}
                  onError={() => setPreviewFailed(true)}
                />
                {previewFailed && (
                  <div className="absolute inset-x-0 bottom-0 bg-background/95 border-t p-3 flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">
                      Inline preview unavailable (large file or unsupported viewer).
                    </span>
                    <div className="flex gap-2">
                      <a href={downloadUrl || previewUrl} target="_blank" rel="noopener noreferrer" className="underline">
                        Open in new tab
                      </a>
                      <a href={downloadUrl || previewUrl} download={prettyName(doc.file_name)} className="underline">
                        Download
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-sm text-muted-foreground">Loading preview…</div>
            )}
          </div>
          <div className="flex flex-col gap-3 min-h-[50vh]">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Extracted fields (editable JSON)
            </div>
            {courses.length > 0 && (
              <div className="rounded border bg-muted/30">
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
                  Programs found ({courses.length})
                </div>
                <div className="max-h-56 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 text-muted-foreground">
                      <tr>
                        <th className="text-left px-2 py-1">Title</th>
                        <th className="text-left px-2 py-1">Duration</th>
                        <th className="text-left px-2 py-1">Tuition</th>
                        <th className="text-left px-2 py-1">Intake</th>
                        <th className="text-left px-2 py-1">Campus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((c) => (
                        <tr key={c.id} className="border-t">
                          <td className="px-2 py-1 truncate max-w-[18ch]" title={c.course_title}>{c.course_title}</td>
                          <td className="px-2 py-1">{c.duration_value ? `${c.duration_value} ${c.duration_unit ?? ""}` : "—"}</td>
                          <td className="px-2 py-1">{c.tuition_fee ? `${c.tuition_fee} ${c.currency ?? ""}` : "—"}</td>
                          <td className="px-2 py-1">{Array.isArray(c.intake_months) && c.intake_months.length ? c.intake_months.join(", ") : "—"}</td>
                          <td className="px-2 py-1">{c.campus_name || c.city || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {payloadIsEmpty && courses.length === 0 && (
              <div className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
                No fields extracted. The file was likely processed as the wrong document type — change the type above and click <span className="font-semibold">Reprocess</span>.
              </div>
            )}
            <Textarea
              value={editedPayload}
              onChange={(e) => setEditedPayload(e.target.value)}
              className="font-mono text-xs flex-1 min-h-[50vh]"
            />
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setStatus("approved")} disabled={busy}>Approve</Button>
              <Button variant="outline" onClick={() => setStatus("needs_review")} disabled={busy}>Save edits</Button>
              <Button variant="outline" onClick={() => setStatus("rejected")} disabled={busy}>Reject</Button>
              <Button variant="secondary" onClick={reprocess} disabled={busy}>Reprocess</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}