import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Object URL for the file. Component does NOT revoke it; caller owns lifecycle. */
  url: string | null;
  mime: string;
  fileName?: string;
  pageImages?: string[];
  loadingPages?: boolean;
}

/**
 * Embedded PDF / image preview that always works inside the app, even when
 * popup blockers block window.open. Used by the upload review queue and any
 * "View" button that needs to be reliable.
 */
export function InlinePreviewDialog({ open, onOpenChange, title, url, mime, fileName, pageImages = [], loadingPages = false }: Props) {
  const [iframeKey, setIframeKey] = useState(0);
  useEffect(() => { if (open) setIframeKey((k) => k + 1); }, [open, url]);

  const isImage = mime.startsWith("image/");
  const isPdf = mime === "application/pdf" || (fileName ?? "").toLowerCase().endsWith(".pdf");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[88vh] p-0 overflow-hidden flex flex-col">
        <div className="px-4 py-3 pr-10 border-b flex items-center justify-between gap-3">
          <DialogTitle className="text-sm truncate">{title}</DialogTitle>
          <div className="flex items-center gap-1.5 shrink-0">
            {url && (
              <>
                <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5 mr-1" /> Open
                  </a>
                </Button>
                <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                  <a href={url} download={fileName ?? "document"}>
                    <Download className="size-3.5 mr-1" /> Download
                  </a>
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="flex-1 bg-muted/30 overflow-auto">
          {!url || loadingPages ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Loading preview…
            </div>
          ) : pageImages.length > 0 ? (
            <div className="min-h-full w-full p-3 space-y-3 bg-muted/40">
              {pageImages.map((src, index) => (
                <img
                  key={`${title}-${index}`}
                  src={src}
                  alt={`${title} page ${index + 1}`}
                  className="mx-auto max-w-full rounded border bg-background shadow-sm"
                />
              ))}
            </div>
          ) : isImage ? (
            <div className="h-full w-full flex items-center justify-center p-3">
              <img src={url} alt={title} className="max-w-full max-h-full object-contain" />
            </div>
          ) : isPdf ? (
            <iframe
              key={iframeKey}
              src={url}
              title={title}
              className="w-full h-full"
              style={{ border: 0 }}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
              <div>This file type can't be previewed inline.</div>
              <Button asChild size="sm">
                <a href={url} download={fileName ?? "document"}>
                  <Download className="size-3.5 mr-1.5" /> Download to view
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}