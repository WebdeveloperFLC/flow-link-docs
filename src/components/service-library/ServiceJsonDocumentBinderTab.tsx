import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import type { FlcDocumentBinder } from "@/lib/service-library/knowledgeGuide/types";

type Props = {
  binder: FlcDocumentBinder;
  title?: string;
};

function requiredBadge(required?: string): { label: string; variant: "default" | "outline" | "secondary" } | null {
  if (!required?.trim()) return null;
  const r = required.trim();
  if (/core|required|mandatory/i.test(r)) {
    return { label: r, variant: "default" };
  }
  if (/if applicable|optional|when/i.test(r)) {
    return { label: r, variant: "outline" };
  }
  return { label: r, variant: "secondary" };
}

export function ServiceJsonDocumentBinderTab({ binder, title }: Props) {
  const categories = binder.categories ?? [];

  if (!categories.length) {
    return (
      <Card className="p-8 text-center shadow-elev-sm">
        <FileText className="size-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">No document binder configured</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {(binder.note || binder.howItWorks) && (
        <Card className="p-4 shadow-elev-sm bg-muted/20 border-dashed">
          {binder.note && <p className="text-sm text-muted-foreground">{binder.note}</p>}
          {binder.howItWorks && (
            <p className="text-xs text-muted-foreground mt-2">{binder.howItWorks}</p>
          )}
        </Card>
      )}

      <Card className="p-5 shadow-elev-sm space-y-4">
        <div>
          <h3 className="font-semibold">{title ?? "Document binder"}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {categories.length} sections ·{" "}
            {categories.reduce((n, c) => n + (c.items?.length ?? 0), 0)} documents
          </p>
        </div>

        <div className="space-y-4">
          {categories.map((cat) => {
            const badge = requiredBadge(cat.required);
            return (
              <div key={cat.category}>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {cat.category}
                  </div>
                  {badge && (
                    <Badge variant={badge.variant} className="text-[10px] font-normal">
                      {badge.label}
                    </Badge>
                  )}
                </div>
                <ul className="space-y-1">
                  {(cat.items ?? []).map((item, idx) => (
                    <li key={`${cat.category}-${idx}`} className="text-sm flex gap-2 items-start">
                      <span className="text-muted-foreground tabular-nums shrink-0">{idx + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
