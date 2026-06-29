import { Badge } from "@/components/ui/badge";
import type { StructuredSectionBlock } from "../types/kc";

export function StructuredSectionPanel({ section }: { section: StructuredSectionBlock | undefined }) {
  if (!section) {
    return <p className="text-sm text-muted-foreground">No content for this section yet.</p>;
  }
  return (
    <div className="space-y-4">
      {section.purpose && (
        <p className="text-sm text-muted-foreground"><strong>Purpose:</strong> {section.purpose}</p>
      )}
      {section.body_md && (
        <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">{section.body_md}</div>
      )}
      {section.tables?.map((t, i) => (
        <div key={i} className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {t.headers.map((h) => (
                  <th key={h} className="border p-2 text-left bg-muted/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border p-2 align-top">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {section.lists?.map((item, i) => (
        <p key={i} className="text-sm">{item}</p>
      ))}
      {section.counselling_objective && (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <strong>Counselling objective:</strong> {section.counselling_objective}
        </div>
      )}
      {section.content_classification?.length && (
        <div className="flex flex-wrap gap-1">
          {section.content_classification.map((c) => (
            <Badge key={c} variant="secondary">{c}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
