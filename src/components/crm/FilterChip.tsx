import { X } from "lucide-react";

export type FilterChipProps = {
  /** Short filter category, e.g. "Status". */
  label: string;
  /** The active value, e.g. "Qualified". */
  value: string;
  /** Called when the user removes this filter. */
  onRemove: () => void;
};

/**
 * A removable "active filter" pill for CRM list toolbars.
 *
 * Presentational only — the parent owns the filter state and decides what
 * "remove" does. Keeps filter chips visually and behaviourally identical
 * across the Clients and Leads workspaces.
 */
export function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs hover:bg-muted transition-colors"
      aria-label={`Remove ${label.toLowerCase()} filter: ${value}`}
    >
      {label}: <span className="font-medium">{value}</span>
      <X className="size-3" aria-hidden="true" />
    </button>
  );
}

export default FilterChip;
