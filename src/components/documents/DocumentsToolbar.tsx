import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type DocumentsViewMode = "section" | "party" | "flat";
export type DocumentsFilterMode = "all" | "missing" | "uploaded" | "approved" | "need_replacement";

interface Props {
  viewMode: DocumentsViewMode;
  filterMode: DocumentsFilterMode;
  searchQuery: string;
  onViewModeChange: (mode: DocumentsViewMode) => void;
  onFilterModeChange: (mode: DocumentsFilterMode) => void;
  onSearchChange: (query: string) => void;
}

export function DocumentsToolbar({
  viewMode,
  filterMode,
  searchQuery,
  onViewModeChange,
  onFilterModeChange,
  onSearchChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium mr-1">View</span>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && onViewModeChange(v as DocumentsViewMode)}
          className="justify-start"
        >
          <ToggleGroupItem value="section" className="text-xs h-8 px-3">
            Section
          </ToggleGroupItem>
          <ToggleGroupItem value="party" className="text-xs h-8 px-3" disabled title="Phase 2B">
            Party
          </ToggleGroupItem>
          <ToggleGroupItem value="flat" className="text-xs h-8 px-3">
            Flat
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterMode} onValueChange={(v) => onFilterModeChange(v as DocumentsFilterMode)}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="missing">Missing</SelectItem>
            <SelectItem value="uploaded">Uploaded</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="need_replacement">Need Replacement</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search document name…"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
