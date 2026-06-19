import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { LocationCascadeFields } from "@/components/shared/LocationCascadeFields";
import type { ProfileExperienceRecord } from "@/lib/profile/types";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LinkedDocumentsPanel, type LinkedDocumentOption } from "@/components/profile/LinkedDocumentsPanel";
import { ProfileRecordCardHeader } from "@/components/profile/ProfileRecordCardHeader";
import { experienceCardPreview } from "@/lib/profile/recordCardPreview";

interface Props {
  records: readonly ProfileExperienceRecord[];
  mode: "view" | "edit";
  expandedId?: string | null;
  availableDocuments?: LinkedDocumentOption[];
  onExpand?: (id: string | null) => void;
  onAdd?: () => void;
  onRemove?: (id: string) => void;
  onPatch?: (id: string, patch: Partial<ProfileExperienceRecord>) => void;
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

export function ProfileExperiencePanel({
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
  if (records.length === 0) {
    return (
      <div className={cn("border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground", className)}>
        No experience records yet.
        {mode === "edit" && onAdd && (
          <div className="mt-3">
            <Button type="button" size="sm" variant="outline" onClick={onAdd}>
              <Plus className="size-3.5 mr-1" /> Add experience
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
        const headline = record.company?.trim() || record.designation?.trim() || `Experience ${index + 1}`;
        const preview = experienceCardPreview(record);
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
                  {viewLine("Role", record.designation)}
                  {viewLine("Department", record.department)}
                  {viewLine("Type", record.employment_type)}
                  {record.currently_working
                    ? viewLine("Status", "Currently working")
                    : viewLine("Until", record.end_date)}
                  <LinkedDocumentsPanel
                    linkedDocuments={record.linked_documents}
                    scope="experience"
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
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Company</Label>
                <Input
                  value={record.company ?? ""}
                  onChange={(e) => onPatch?.(record.id, { company: e.target.value || null })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Designation</Label>
                <Input
                  value={record.designation ?? ""}
                  onChange={(e) => onPatch?.(record.id, { designation: e.target.value || null })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Department</Label>
                <Input
                  value={record.department ?? ""}
                  onChange={(e) => onPatch?.(record.id, { department: e.target.value || null })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Employment type</Label>
                <Input
                  value={record.employment_type ?? ""}
                  onChange={(e) => onPatch?.(record.id, { employment_type: e.target.value || null })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Start date</Label>
                <Input
                  type="date"
                  value={record.start_date ?? ""}
                  onChange={(e) => onPatch?.(record.id, { start_date: e.target.value || null })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End date</Label>
                <Input
                  type="date"
                  value={record.end_date ?? ""}
                  disabled={record.currently_working}
                  onChange={(e) => onPatch?.(record.id, { end_date: e.target.value || null })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`working-${record.id}`}
                checked={record.currently_working}
                onCheckedChange={(v) =>
                  onPatch?.(record.id, {
                    currently_working: v === true,
                    end_date: v === true ? null : record.end_date,
                  })
                }
              />
              <Label htmlFor={`working-${record.id}`} className="text-xs">
                Currently working here
              </Label>
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
              scope="experience"
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
