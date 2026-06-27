import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadDocumentPlaceholder } from "@/components/leads/LeadDocumentPlaceholder";
import { getSlotsForScope, slotLabel, type SlotScope } from "@/lib/profile/profileDocumentSlots";
import type { ProfileLinkedDocument } from "@/lib/profile/types";
import { FileText, Link2, Plus, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LinkedDocumentOption {
  id: string;
  file_name: string;
  document_type?: string;
}

interface Props {
  linkedDocuments: readonly ProfileLinkedDocument[];
  scope: SlotScope;
  mode: "view" | "edit";
  availableDocuments?: LinkedDocumentOption[];
  uploading?: boolean;
  onLinkExisting?: (documentId: string, slot: string) => void;
  onUnlink?: (documentId: string, slot: string) => void;
  onUpload?: (file: File, slot: string) => void;
  /** Phase D — leads show placeholder instead of link/upload controls. */
  documentsPlaceholder?: boolean;
  className?: string;
}

export function LinkedDocumentsPanel({
  linkedDocuments,
  scope,
  mode,
  availableDocuments = [],
  uploading,
  onLinkExisting,
  onUnlink,
  onUpload,
  documentsPlaceholder,
  className,
}: Props) {
  const slots = getSlotsForScope(scope);
  const linkedBySlot = new Map(linkedDocuments.map((d) => [d.slot, d]));

  if (documentsPlaceholder && mode === "edit") {
    return <LeadDocumentPlaceholder className={className} />;
  }

  if (mode === "view") {
    if (linkedDocuments.length === 0) {
      return (
        <p className={cn("text-xs text-muted-foreground", className)}>No linked documents</p>
      );
    }
    return (
      <ul className={cn("space-y-1.5", className)}>
        {linkedDocuments.map((doc) => (
          <li
            key={`${doc.slot}-${doc.document_id}`}
            className="flex items-center gap-2 text-xs rounded-md border bg-muted/20 px-2 py-1.5"
          >
            <FileText className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="font-medium">{slotLabel(doc.slot, doc.label)}</span>
            <span className="text-muted-foreground truncate">
              {doc.file_name ?? doc.document_id.slice(0, 8)}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Upload documents</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={uploading}>
              <Plus className="size-3 mr-1" /> Link
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3 space-y-3" align="end">
            <div className="space-y-1">
              <span className="text-xs font-medium">Link existing file</span>
              <Select onValueChange={(v) => {
                const [docId, slot] = v.split("::");
                if (docId && slot) onLinkExisting?.(docId, slot);
              }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choose document + slot" />
                </SelectTrigger>
                <SelectContent>
                  {availableDocuments.flatMap((doc) =>
                    slots.map((slot) => (
                      <SelectItem key={`${doc.id}-${slot.id}`} value={`${doc.id}::${slot.id}`}>
                        {doc.file_name} → {slot.label}
                      </SelectItem>
                    )),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 border-t pt-2">
              <span className="text-xs font-medium">Upload new</span>
              {slots.map((slot) => (
                <label
                  key={slot.id}
                  className="flex items-center gap-2 text-xs cursor-pointer hover:text-primary"
                >
                  <Upload className="size-3" />
                  <span>{slot.label}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUpload?.(file, slot.id);
                      e.target.value = "";
                    }}
                  />
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {slots.map((slot) => {
        const doc = linkedBySlot.get(slot.id);
        return (
          <div
            key={slot.id}
            className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs"
          >
            <Link2 className="size-3 shrink-0 text-muted-foreground" />
            <span className="font-medium min-w-[7rem]">{slot.label}</span>
            {doc ? (
              <>
                <span className="flex-1 truncate text-muted-foreground">
                  {doc.file_name ?? doc.document_id}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  onClick={() => onUnlink?.(doc.document_id, doc.slot)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </>
            ) : (
              <>
                <Badge variant="outline" className="text-[10px] font-normal">
                  Empty
                </Badge>
                {onUpload && (
                  <label
                    className={cn(
                      "ml-auto inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium cursor-pointer hover:bg-muted/50",
                      uploading && "pointer-events-none opacity-50",
                    )}
                  >
                    <Upload className="size-3" />
                    Upload
                    <input
                      type="file"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUpload(file, slot.id);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
