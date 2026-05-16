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
  const [editedPayload, setEditedPayload] = useState<string>("");
  const [docKind, setDocKind] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!docProp) { setDoc(null); return; }
    setDoc(docProp);
    // Re-fetch the latest row so confidence / pipeline_status reflect the post-orchestrator state
    supabase
      .from("upi_uploaded_documents")
      .select("*")
      .eq("id", docProp.id)
      .single()
      .then(({ data }) => {
        const fresh = data ?? docProp;
        setDoc(fresh);
        setEditedPayload(JSON.stringify(fresh.extracted_payload ?? {}, null, 2));
        setDocKind(fresh.metadata?.doc_kind ?? "");
        if (fresh.file_path) {
          supabase.storage
            .from("institution-documents")
            .createSignedUrl(fresh.file_path, 600)
            .then(({ data: sig }) => setPreviewUrl(sig?.signedUrl ?? ""));
        }
      });
  }, [docProp]);

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
            <span className="truncate">{doc.file_name}</span>
            <Badge variant="outline">{doc.pipeline_status ?? doc.review_status}</Badge>
            <Badge>{doc.confidence_score ?? 0}% confidence</Badge>
          </DialogTitle>
        </DialogHeader>
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
              <iframe src={previewUrl} className="w-full h-[70vh]" title="Document preview" />
            ) : (
              <div className="p-6 text-sm text-muted-foreground">Loading preview…</div>
            )}
          </div>
          <div className="flex flex-col gap-3 min-h-[50vh]">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Extracted fields (editable JSON)
            </div>
            {payloadIsEmpty && (
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