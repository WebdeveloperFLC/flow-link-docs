import { useRef, useState } from "react";
import { Download, Eye, FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { openClientDocument } from "@/lib/documentPreview";
import { uploadDocumentForRequirement } from "@/lib/documentWorkflow/uploadDocumentForRequirement";
import type { EnrichedRequirement } from "@/lib/documentWorkflow/buildEnrichedRequirements";
import type { CaseSection } from "@/lib/sections";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  requirement: EnrichedRequirement;
  clientId: string;
  caseId: string | null;
  sections: CaseSection[];
  canUpload: boolean;
  highlight?: boolean;
  onChanged: () => void;
}

export function DocumentRequirementRow({
  requirement,
  clientId,
  caseId,
  sections,
  canUpload,
  highlight = false,
  onChanged,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const doc = requirement.matchedDocument;

  const onUpload = async (files: FileList | null) => {
    if (!files?.length || !canUpload) return;
    setUploading(true);
    try {
      const res = await uploadDocumentForRequirement({
        clientId,
        caseId,
        requirement,
        file: files[0],
        sections,
        displayLabel: requirement.display_name,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Upload failed");
        return;
      }
      toast.success(`${requirement.display_name} uploaded`);
      onChanged();
    } finally {
      setUploading(false);
    }
  };

  const onView = async () => {
    if (!doc) return;
    await openClientDocument({
      storagePath: doc.storage_path,
      fileName: doc.file_name,
      mimeType: doc.mime_type,
    });
  };

  const onDownload = async () => {
    if (!doc) return;
    const { data } = await supabase.storage.from("client-documents").download(doc.storage_path);
    if (!data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id={requirement.anchorId}
      className={cn(
        "px-4 py-3 flex items-start gap-3 border-b last:border-b-0 transition-shadow",
        highlight && "ring-2 ring-primary ring-offset-2 bg-primary/5",
      )}
    >
      <FileText className="size-4 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{requirement.display_name}</span>
          {requirement.mandatory ? (
            <span className="text-[10px] text-secondary font-semibold uppercase tracking-wide">Required</span>
          ) : null}
          <DocumentStatusBadge status={requirement.displayStatus} />
        </div>
        {doc ? (
          <div className="text-xs text-muted-foreground truncate">
            {doc.file_name}
            {doc.version > 1 ? ` · v${doc.version}` : ""}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No file uploaded yet</div>
        )}
        {requirement.notes ? (
          <div className="text-[11px] text-muted-foreground">{requirement.notes}</div>
        ) : null}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {doc ? (
          <>
            <Button size="icon" variant="ghost" className="size-7" onClick={onView} title="View">
              <Eye className="size-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="size-7" onClick={onDownload} title="Download">
              <Download className="size-3.5" />
            </Button>
          </>
        ) : null}
        {canUpload ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                void onUpload(e.target.files);
                e.currentTarget.value = "";
              }}
            />
            <Button
              size="sm"
              variant={doc ? "outline" : "default"}
              className="h-7 text-xs"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-3 mr-1 animate-spin" />
              ) : (
                <Upload className="size-3 mr-1" />
              )}
              {doc ? "Replace" : "Upload"}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
