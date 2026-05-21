import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CopyLinkButton({ url, label = "Copy link" }: { url: string | null; label?: string }) {
  if (!url) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied");
        } catch {
          toast.error("Copy failed");
        }
      }}
    >
      <Copy className="size-3.5 mr-1" />
      {label}
    </Button>
  );
}