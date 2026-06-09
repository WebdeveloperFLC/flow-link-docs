import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Info, X, ExternalLink } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ServiceCatalogueItem } from "@/lib/leads";
import {
  serviceFeeLabel,
  governmentFeeDisplay,
  SERVICE_PICKER_GRID,
  type FeeCurrency,
} from "@/lib/leads/serviceFeeLabel";
import { buildServiceLibraryUrl } from "@/lib/service-library/serviceCodes";
import { classifyCoachingVariant } from "@/lib/service-library/serviceNavClassification";

const FEE_CELL =
  "text-xs text-foreground/80 text-right tabular-nums whitespace-nowrap min-w-0 overflow-hidden text-ellipsis";

export function ServiceFeeColumnsHeader({ feeCurrency }: { feeCurrency: FeeCurrency }) {
  return (
    <div
      className={cn(
        SERVICE_PICKER_GRID,
        "px-3 py-1.5 border-b bg-muted/30 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
      )}
    >
      <div />
      <div className="min-w-0">Service</div>
      <div className="text-right min-w-0">Consultancy ({feeCurrency})</div>
      <div className="text-right min-w-0">Government</div>
    </div>
  );
}

type Props = {
  item: ServiceCatalogueItem;
  checked: boolean;
  disabled?: boolean;
  openNote: string | null;
  onToggle: () => void;
  onOpenNote: (id: string | null) => void;
  feeCurrency: FeeCurrency;
};

export function ServicePickerRow({
  item,
  checked,
  disabled,
  openNote,
  onToggle,
  onOpenNote,
  feeCurrency,
}: Props) {
  const hasNote = typeof item.notes === "string" && item.notes.trim().length > 0;
  const libraryId = item.library_id;
  const isCoaching = item.master_key === "coaching_services";
  const isVisa = item.master_key === "visa_immigration";
  const slUrl =
    libraryId != null
      ? buildServiceLibraryUrl({
          libraryId,
          country: isVisa ? item.country_tag : null,
          cat: isCoaching ? "coaching" : isVisa ? "visa" : null,
          family: isCoaching ? item.group_key : null,
          variant: isCoaching ? classifyCoachingVariant(item.service_name) : null,
        })
      : null;
  const govt = governmentFeeDisplay(item, feeCurrency);

  return (
    <div
      className={cn(
        SERVICE_PICKER_GRID,
        "px-3 py-2 border-l-2 transition-colors",
        checked ? "bg-primary/5 border-primary" : "border-transparent hover:bg-muted/30",
        disabled && "opacity-60",
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        disabled={disabled}
        className="shrink-0"
      />
      <div className="min-w-0 overflow-hidden">
        <div
          className={cn(
            "text-sm flex items-center gap-1.5 min-w-0",
            checked ? "font-semibold text-foreground" : "font-medium",
          )}
        >
          {slUrl ? (
            <Link
              to={slUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="truncate text-primary hover:underline inline-flex items-center gap-1 min-w-0 max-w-full"
            >
              <span className="truncate">{item.service_name}</span>
              <ExternalLink className="size-3 shrink-0 opacity-60" />
            </Link>
          ) : (
            <span className="truncate">{item.service_name}</span>
          )}
          {hasNote && (
            <Popover open={openNote === item.id} onOpenChange={(o) => onOpenNote(o ? item.id : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="Service info"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" onClick={(e) => e.preventDefault()}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="text-sm font-medium">{item.service_name}</div>
                  <button
                    type="button"
                    onClick={() => onOpenNote(null)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Close"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{item.notes}</div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        {item.sub_category && (
          <div className="text-xs text-muted-foreground truncate">{item.sub_category}</div>
        )}
      </div>
      <div className={FEE_CELL} title={serviceFeeLabel(item, feeCurrency, "consultancy")}>
        {serviceFeeLabel(item, feeCurrency, "consultancy")}
      </div>
      <div className={cn(FEE_CELL, "flex flex-col items-end leading-tight")} title={govt.primary}>
        <span className="max-w-full overflow-hidden text-ellipsis">{govt.primary}</span>
        {govt.equivalent && (
          <span className="text-[10px] text-muted-foreground max-w-full overflow-hidden text-ellipsis">
            {govt.equivalent}
          </span>
        )}
      </div>
    </div>
  );
}
