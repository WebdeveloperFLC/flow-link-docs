import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ServiceAcademyMetadata } from "@/lib/service-library/academyTypes";

type SampleDoc = NonNullable<ServiceAcademyMetadata["sampleDocs"]>[number];

const DOC_KINDS = [
  { value: "__auto", label: "Auto-detect from title" },
  { value: "financial", label: "Bank / financial statement" },
  { value: "employment", label: "Employment letter" },
  { value: "passport", label: "Passport" },
  { value: "photo", label: "Photo specification" },
  { value: "letter", label: "Generic letter" },
];

const PRESETS: SampleDoc[] = [
  { title: "Passport (bio page)", description: "Valid passport with 6+ months validity", docKind: "passport" },
  { title: "Bank statement (4–6 months)", description: "Seasoned funds proof", docKind: "financial" },
  { title: "Letter of Acceptance (LOA)", description: "From DLI / institution" },
  { title: "Employment confirmation letter", description: "For employed applicants", docKind: "employment" },
  { title: "Digital photo (specimen)", description: "IRCC photo requirements", docKind: "photo" },
  { title: "Invitation letter (visitor)", description: "Host in Canada invites visitor" },
];

export function SampleDocsEditor({
  items,
  onChange,
}: {
  items: SampleDoc[];
  onChange: (items: SampleDoc[]) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Counselors see mock specimens in the Sample docs tab (no file upload required). Use title keywords like
        &quot;passport&quot;, &quot;bank&quot;, &quot;LOA&quot; or set <strong>doc kind</strong> for the preview layout.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { title: "", description: "" }])}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add sample doc
        </Button>
        {PRESETS.map((preset) => (
          <Button
            key={preset.title}
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => onChange([...items, { ...preset }])}
          >
            + {preset.title.split(" ")[0]}…
          </Button>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">
          No sample docs configured. Add presets above or use Bulk JSON <code>sampleDocs</code> array.
        </p>
      )}

      <div className="space-y-3">
        {items.map((doc, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2">
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Title</Label>
                <Input
                  value={doc.title}
                  onChange={(e) => onChange(items.map((d, j) => (j === i ? { ...d, title: e.target.value } : d)))}
                />
              </div>
              <div>
                <Label className="text-xs">Doc kind (mock layout)</Label>
                <Select
                  value={doc.docKind ?? "__auto"}
                  onValueChange={(v) =>
                    onChange(
                      items.map((d, j) =>
                        j === i ? { ...d, docKind: v === "__auto" ? undefined : v } : d,
                      ),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Description (counselor hint)</Label>
              <Textarea
                rows={2}
                value={doc.description ?? ""}
                onChange={(e) => onChange(items.map((d, j) => (j === i ? { ...d, description: e.target.value } : d)))}
              />
            </div>
            <div>
              <Label className="text-xs">Optional file path (storage) or URL</Label>
              <Input
                placeholder="checklist/… or https://…"
                value={doc.filePath ?? doc.url ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange(
                    items.map((d, j) =>
                      j === i
                        ? v.startsWith("http")
                          ? { ...d, url: v, filePath: undefined }
                          : { ...d, filePath: v || undefined, url: undefined }
                        : d,
                    ),
                  );
                }}
                className="font-mono text-xs"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
