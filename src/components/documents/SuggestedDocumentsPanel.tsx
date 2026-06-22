import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ProfileDocumentDef } from "@/lib/documentWorkflow/visaDocumentProfiles";

interface Props {
  suggestions: ProfileDocumentDef[];
  labelByCode: Map<string, string>;
  canUpload: boolean;
  busyCode: string | null;
  onAccept: (code: string) => void;
}

export function SuggestedDocumentsPanel({
  suggestions,
  labelByCode,
  canUpload,
  busyCode,
  onAccept,
}: Props) {
  if (suggestions.length === 0) return null;

  return (
    <Card className="p-4 space-y-3 border-dashed bg-muted/30">
      <div>
        <div className="font-semibold text-sm">Suggested documents</div>
        <p className="text-xs text-muted-foreground mt-1">
          Based on client profile answers. Add only when relevant — suggestions are not required until accepted.
        </p>
      </div>
      <ul className="space-y-2">
        {suggestions.map((s) => {
          const label = labelByCode.get(s.code) ?? s.code;
          return (
            <li
              key={s.code}
              className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm"
            >
              <span>{label}</span>
              {canUpload ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyCode === s.code}
                  onClick={() => onAccept(s.code)}
                >
                  <Plus className="size-3.5 mr-1" />
                  Add
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
