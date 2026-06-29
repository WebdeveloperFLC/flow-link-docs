import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import type { KcSourceRef } from "@/knowledge-centre/types/kc";

export function OfficialSourcesSectionPanel({ refs }: { refs: KcSourceRef[] }) {
  if (!refs.length) return <p className="text-sm text-muted-foreground">No official source links yet.</p>;
  return (
    <div className="space-y-2">
      {refs.map((r) => {
        const src = r.source;
        if (!src) return null;
        return (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-md p-3">
            <div>
              <div className="font-medium text-sm">{r.anchor_label || src.title}</div>
              <div className="text-xs text-muted-foreground">{src.authority} · {src.category}</div>
            </div>
            <Button size="sm" variant="outline" asChild>
              <a href={src.official_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4 mr-1" /> Open
              </a>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
