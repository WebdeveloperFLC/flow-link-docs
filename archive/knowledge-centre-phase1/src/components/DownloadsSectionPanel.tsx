import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import type { KcDownloadAsset } from "@/knowledge-centre/types/kc";
import { getSignedDownloadUrl } from "@/knowledge-centre/repositories/kcRepo";

export function DownloadsSectionPanel({ assets }: { assets: KcDownloadAsset[] }) {
  if (!assets.length) return <p className="text-sm text-muted-foreground">No downloads yet.</p>;

  const open = async (path: string) => {
    const url = await getSignedDownloadUrl(path);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {assets.map((d) => (
        <Card key={d.id} className="p-4 flex flex-col gap-2">
          <div className="font-medium text-sm">{d.title}</div>
          <Badge variant="secondary" className="text-xs">{d.download_type.replace(/_/g, " ")}</Badge>
          {d.metadata?.journey_stage && (
            <span className="text-xs text-muted-foreground">Stage: {String(d.metadata.journey_stage)}</span>
          )}
          <Button size="sm" variant="outline" className="mt-auto" onClick={() => open(d.storage_path)}>
            <Download className="size-4 mr-1" /> Download
          </Button>
        </Card>
      ))}
    </div>
  );
}
