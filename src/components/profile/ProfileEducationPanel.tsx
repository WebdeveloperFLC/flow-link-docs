import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationCascadeFields } from "@/components/shared/LocationCascadeFields";
import { useMasterItems } from "@/lib/masters";
import type { ProfileEducationRecord } from "@/lib/profile/types";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LinkedDocumentsPanel, type LinkedDocumentOption } from "@/components/profile/LinkedDocumentsPanel";
import { ProfileRecordCardHeader } from "@/components/profile/ProfileRecordCardHeader";
import { educationCardPreview } from "@/lib/profile/recordCardPreview";

interface Props {
  records: readonly ProfileEducationRecord[];
  mode: "view" | "edit";
  expandedId?: string | null;
  availableDocuments?: LinkedDocumentOption[];
  onExpand?: (id: string | null) => void;
  onAdd?: () => void;
  onRemove?: (id: string) => void;
  onPatch?: (id: string, patch: Partial<ProfileEducationRecord>) => void;
  onLinkDocument?: (recordId: string, documentId: string, slot: string) => void;
  onUnlinkDocument?: (recordId: string, documentId: string, slot: string) => void;
  onUploadDocument?: (recordId: string, file: File, slot: string) => void;
  documentsPlaceholder?: boolean;
  className?: string;
}

function viewLine(label: string, value: string | null | undefined) {
  const v = (value ?? "").trim();
  if (!v) return null;
  return (
    <div className="text-xs">
      <span className="text-muted-foreground">{label}: </span>
      <span>{v}</span>
    </div>
  );
}

function normalizeYearInput(year?: string | null): string {
  if (!year?.trim()) return "";
  const v = year.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.slice(0, 4);
  return v.replace(/\D/g, "").slice(0, 4);
}

export function ProfileEducationPanel({
  records,
  mode,
  expandedId,
  availableDocuments,
  onExpand,
  onAdd,
  onRemove,
  onPatch,
  onLinkDocument,
  onUnlinkDocument,
  onUploadDocument,
  documentsPlaceholder,
  className,
}: Props) {
  const qualificationLevels = useMasterItems("qualification_levels");

  if (records.length === 0) {
    return (
      <div className={cn("border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground", className)}>
        No education records yet.
        {mode === "edit" && onAdd && (
          <div className="mt-3">
            <Button type="button" size="sm" variant="outline" onClick={onAdd}>
              <Plus className="size-3.5 mr-1" /> Add education
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {mode === "edit" && onAdd && (
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="outline" onClick={onAdd}>
            <Plus className="size-3.5 mr-1" /> Add
          </Button>
        </div>
      )}
      {records.map((record, index) => {
        const expanded = expandedId === record.id;
        const qualificationLabel = qualificationLevels.find(
          (q) => q.code === record.qualification_type,
        )?.label;
        const headline =
          qualificationLabel ||
          record.qualification_type?.trim() ||
          record.institution_name?.trim() ||
          `Education ${index + 1}`;
        const preview = educationCardPreview(record, qualificationLabel);
        const toggleExpand = () => onExpand?.(expanded ? null : record.id);

        if (mode === "view") {
          return (
            <div key={record.id} className="rounded-lg border p-3 space-y-1">
              <ProfileRecordCardHeader
                headline={headline}
                preview={preview}
                expanded={expanded}
                onToggle={toggleExpand}
              />
              {expanded && (
                <>
                  {viewLine("Institution", record.institution_name)}
                  {viewLine("Field", record.field_of_study)}
                  {viewLine("Major", record.major)}
                  {viewLine("Start year", record.start_year)}
                  {viewLine("End year", record.end_year)}
                  {viewLine("Status", record.status)}
                  {viewLine("Grade type", record.grade_type)}
                  {viewLine("Score", record.score)}
                  {viewLine("Backlogs", record.backlogs)}
                  {viewLine("Notes", record.notes)}
                  {(record.country || record.state_province || record.city) && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Location: </span>
                      <span>
                        {[record.city, record.state_province, record.country].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                  <LinkedDocumentsPanel
                    linkedDocuments={record.linked_documents}
                    scope="education"
                    mode="view"
                    className="mt-2"
                  />
                </>
              )}
            </div>
          );
        }

        return (
          <div
            key={record.id}
            className={cn(
              "rounded-lg border bg-muted/10",
              expanded ? "p-3 space-y-3" : "p-2.5",
            )}
          >
            <ProfileRecordCardHeader
              headline={headline}
              preview={preview}
              expanded={expanded}
              onToggle={toggleExpand}
              onRemove={onRemove ? () => onRemove(record.id) : undefined}
            />
            {expanded && (
              <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Qualification</Label>
                <Select
                  value={record.qualification_type ?? ""}
                  onValueChange={(v) => onPatch?.(record.id, { qualification_type: v || null })}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {qualificationLevels.map((q) => (
                      <SelectItem key={q.code} value={q.code}>{q.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Institution</Label>
                <Input
                  value={record.institution_name ?? ""}
                  onChange={(e) => onPatch?.(record.id, { institution_name: e.target.value || null })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Field of study</Label>
                <Input
                  value={record.field_of_study ?? ""}
                  onChange={(e) => onPatch?.(record.id, { field_of_study: e.target.value || null })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Major</Label>
                <Input
                  value={record.major ?? ""}
                  onChange={(e) => onPatch?.(record.id, { major: e.target.value || null })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Start year</Label>
                <Input
                  type="number"
                  min={1950}
                  max={2100}
                  placeholder="e.g. 2020"
                  value={normalizeYearInput(record.start_year)}
                  onChange={(e) =>
                    onPatch?.(record.id, { start_year: e.target.value ? String(e.target.value) : null })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End year</Label>
                <Input
                  type="number"
                  min={1950}
                  max={2100}
                  placeholder="e.g. 2024"
                  value={normalizeYearInput(record.end_year)}
                  onChange={(e) =>
                    onPatch?.(record.id, { end_year: e.target.value ? String(e.target.value) : null })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Input
                  value={record.status ?? ""}
                  onChange={(e) => onPatch?.(record.id, { status: e.target.value || null })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Grade type</Label>
                <Input
                  value={record.grade_type ?? ""}
                  onChange={(e) => onPatch?.(record.id, { grade_type: e.target.value || null })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Score</Label>
                <Input
                  value={record.score ?? ""}
                  onChange={(e) => onPatch?.(record.id, { score: e.target.value || null })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Backlogs</Label>
                <Input
                  value={record.backlogs ?? ""}
                  onChange={(e) => onPatch?.(record.id, { backlogs: e.target.value || null })}
                />
              </div>
            </div>
            <LocationCascadeFields
              value={{
                country: record.country,
                state_province: record.state_province,
                city: record.city,
              }}
              onChange={(patch) =>
                onPatch?.(record.id, {
                  country: patch.country ?? record.country,
                  state_province: patch.state_province ?? record.state_province,
                  city: patch.city ?? record.city,
                })
              }
            />
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea
                rows={2}
                value={record.notes ?? ""}
                onChange={(e) => onPatch?.(record.id, { notes: e.target.value || null })}
              />
            </div>
            <LinkedDocumentsPanel
              linkedDocuments={record.linked_documents}
              scope="education"
              mode="edit"
              availableDocuments={availableDocuments}
              documentsPlaceholder={documentsPlaceholder}
              onLinkExisting={(docId, slot) => onLinkDocument?.(record.id, docId, slot)}
              onUnlink={(docId, slot) => onUnlinkDocument?.(record.id, docId, slot)}
              onUpload={(file, slot) => onUploadDocument?.(record.id, file, slot)}
            />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
