import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MOCK_ENTITIES } from "../../data/mockReports";
import type {
  EntityCode,
  PeriodPreset,
  ComparisonMode,
} from "../../types/reports";

interface Props {
  entities: EntityCode[];
  onEntitiesChange: (e: EntityCode[]) => void;
  branch?: string;
  onBranchChange?: (b: string) => void;
  period?: PeriodPreset;
  onPeriodChange?: (p: PeriodPreset) => void;
  comparison?: ComparisonMode;
  onComparisonChange?: (c: ComparisonMode) => void;
  rightSlot?: ReactNode;
  showPeriod?: boolean;
  showComparison?: boolean;
  showBranch?: boolean;
  extra?: ReactNode;
}

const ALL_BRANCHES = "all";

export default function ReportFilterBar({
  entities,
  onEntitiesChange,
  branch = ALL_BRANCHES,
  onBranchChange,
  period = "QUARTER",
  onPeriodChange,
  comparison = "PRIOR_PERIOD",
  onComparisonChange,
  rightSlot,
  showPeriod = true,
  showComparison = true,
  showBranch = true,
  extra,
}: Props) {
  const allEntityCodes = MOCK_ENTITIES.map((e) => e.code);
  const allSelected = entities.length === allEntityCodes.length;

  const toggleEntity = (code: EntityCode) => {
    if (entities.includes(code)) onEntitiesChange(entities.filter((e) => e !== code));
    else onEntitiesChange([...entities, code]);
  };

  const branches = Array.from(
    new Set(MOCK_ENTITIES.flatMap((e) => e.branches))
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 min-w-[180px] justify-between">
            <span className="truncate">
              {allSelected
                ? "All entities"
                : entities.length === 0
                ? "No entities"
                : `${entities.length} entit${entities.length === 1 ? "y" : "ies"}`}
            </span>
            <ChevronDown className="size-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2 bg-popover" align="start">
          <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground">
            <span>Entities</span>
            <button
              className="hover:text-foreground"
              onClick={() =>
                onEntitiesChange(allSelected ? [] : (allEntityCodes as EntityCode[]))
              }
            >
              {allSelected ? "Clear" : "All"}
            </button>
          </div>
          <div className="max-h-64 overflow-auto">
            {MOCK_ENTITIES.map((e) => {
              const checked = entities.includes(e.code);
              return (
                <label
                  key={e.code}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggleEntity(e.code)} />
                  <span className="text-sm flex-1 truncate">{e.name}</span>
                  <span className="text-[10px] text-muted-foreground">{e.currency}</span>
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {showBranch && onBranchChange && (
        <Select value={branch} onValueChange={onBranchChange}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value={ALL_BRANCHES}>All branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showPeriod && onPeriodChange && (
        <Select value={period} onValueChange={(v) => onPeriodChange(v as PeriodPreset)}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="MONTH">This month</SelectItem>
            <SelectItem value="QUARTER">This quarter</SelectItem>
            <SelectItem value="FY">This FY</SelectItem>
            <SelectItem value="CUSTOM">Custom</SelectItem>
          </SelectContent>
        </Select>
      )}

      {showComparison && onComparisonChange && (
        <ToggleGroup
          type="single"
          size="sm"
          value={comparison}
          onValueChange={(v) => v && onComparisonChange(v as ComparisonMode)}
          className="h-9"
        >
          <ToggleGroupItem value="PRIOR_PERIOD" className="text-xs px-3">
            vs last period
          </ToggleGroupItem>
          <ToggleGroupItem value="PRIOR_YEAR" className="text-xs px-3">
            vs last year
          </ToggleGroupItem>
        </ToggleGroup>
      )}

      {extra}

      <div className="ml-auto flex items-center gap-2">{rightSlot}</div>
    </div>
  );
}