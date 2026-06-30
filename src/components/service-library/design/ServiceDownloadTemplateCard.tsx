import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FlcDownloadTemplate, FlcKnowledgeGuideSource } from "@/lib/service-library/knowledgeGuide/types";
import { cn } from "@/lib/utils";

type TemplateWithExtras = FlcDownloadTemplate & {
  standaloneFile?: string;
  audience?: string;
  content?: FlcDownloadTemplate["content"] & {
    sourceRefs?: (string | { id: string; url?: string })[];
  };
};

function resolveTemplateGuideUrl(
  template: TemplateWithExtras,
  guideSlug?: string | null,
): string | undefined {
  const standalone = template.standaloneFile?.trim();
  if (standalone) {
    if (/^https?:\/\//i.test(standalone) || standalone.startsWith("/")) return standalone;
    const slug = guideSlug?.trim() || "canada-student-visa";
    return `/content/service-library/${slug}/downloads/${standalone}`;
  }
  const fileUrl = template.fileUrl?.trim();
  if (fileUrl && !fileUrl.startsWith("#")) return fileUrl;
  return undefined;
}

function normalizeSourceRefIds(
  refs: TemplateWithExtras["content"] extends infer C
    ? C extends { sourceRefs?: infer R }
      ? R
      : never
    : never,
): string[] {
  if (!Array.isArray(refs)) return [];
  return refs
    .map((ref) => (typeof ref === "string" ? ref : ref?.id))
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

type Props = {
  template: TemplateWithExtras;
  guideSources: FlcKnowledgeGuideSource[];
  /** ZIP guide slug — resolves relative standaloneFile paths (e.g. canada-visitor-visa). */
  guideSlug?: string | null;
};

export function ServiceDownloadTemplateCard({ template, guideSources, guideSlug }: Props) {
  const [open, setOpen] = useState(false);
  const isFreeGuide = /free guide/i.test(template.template);
  const subtitle = [template.use, template.stage].filter(Boolean).join(" · ");
  const guideUrl = resolveTemplateGuideUrl(template, guideSlug);
  const sourceIds = normalizeSourceRefIds(template.content?.sourceRefs);
  const sourceById = new Map(guideSources.map((s) => [s.id, s]));

  return (
    <Card className="shadow-elev-sm overflow-hidden">
      <button
        type="button"
        className={cn(
          "w-full p-4 flex items-start justify-between gap-3 text-left transition-colors",
          "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm">{template.template}</span>
            {isFreeGuide && (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                Client-facing
              </Badge>
            )}
          </div>
          {subtitle ? (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          ) : null}
        </div>
        <span className="text-xs font-medium text-primary shrink-0 pt-0.5">
          {open ? "Close ▴" : "Open / view ▾"}
        </span>
      </button>

      {open ? (
        <div className="px-4 pb-4 border-t border-border/60 space-y-3">
          {isFreeGuide && guideUrl ? (
            <a
              href={guideUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Open full guide ↗
            </a>
          ) : null}

          {template.content?.intro ? (
            <p className="text-sm text-muted-foreground">{template.content.intro}</p>
          ) : null}

          {template.content?.sections?.map((section) => (
            <div key={section.heading}>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                {section.heading}
              </h4>
              <ul className="text-sm space-y-1">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {sourceIds.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {sourceIds.map((id) => {
                const source = sourceById.get(id);
                if (source?.url) {
                  return (
                    <a
                      key={id}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-md border bg-muted/50 px-2 py-0.5 text-[11px] font-mono text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {id}
                    </a>
                  );
                }
                return (
                  <span
                    key={id}
                    className="inline-flex items-center rounded-md border bg-muted/50 px-2 py-0.5 text-[11px] font-mono text-muted-foreground"
                  >
                    {id}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
