import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  document: any | null;
  institutionId: string;
  onChanged: () => void;
}

export function AiReviewPanel({ open, onOpenChange, document: doc, institutionId, onChanged }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [editedPayload, setEditedPayload] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!doc) return;
    setEditedPayload(JSON.stringify(doc.extracted_payload ?? {}, null, 2));
    if (doc.file_path) {
      supabase.storage
        .from("institution-documents")
        .createSignedUrl(doc.file_path, 600)
        .then(({ data }) => setPreviewUrl(data?.signedUrl ?? ""));
    }
  }, [doc]);

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
    const kind = doc.metadata?.doc_kind ?? "brochure";
    const { error } = await supabase.functions.invoke("upi-document-orchestrator", {
      body: { document_id: doc.id, institution_id: institutionId, doc_kind: kind },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Reprocessing started"); onChanged(); }
  };

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