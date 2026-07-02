import { useState } from "react";
import { Bookmark, BookmarkPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  useSavedViews,
  normalizeViewQuery,
  type SavedViewNamespace,
} from "@/lib/crm/savedViews";

export type SavedViewsBarProps = {
  /** Which list this bar belongs to. */
  namespace: SavedViewNamespace;
  /** The current filter/sort state as a query string (URLSearchParams.toString()). */
  currentQuery: string;
  /** Apply a saved view's query string to the list. */
  onApply: (query: string) => void;
};

/**
 * Compact "saved views" control for CRM list toolbars.
 *
 * Lets users name and recall filter/sort combinations. Persistence is handled
 * by useSavedViews (localStorage). Purely a UI + persistence convenience — it
 * does not alter any query semantics or business logic.
 */
export function SavedViewsBar({ namespace, currentQuery, onApply }: SavedViewsBarProps) {
  const { views, addView, removeView } = useSavedViews(namespace);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  const normalizedCurrent = normalizeViewQuery(currentQuery);
  const hasFilters = normalizedCurrent.length > 0;

  const save = () => {
    if (!name.trim()) return;
    addView(name, currentQuery);
    setName("");
    setOpen(false);
  };

  if (views.length === 0 && !hasFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Saved views">
      {views.length > 0 && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Bookmark className="size-3.5" aria-hidden="true" /> Views:
        </span>
      )}
      {views.map((v) => {
        const active = normalizeViewQuery(v.query) === normalizedCurrent;
        return (
          <span
            key={v.id}
            className={cn(
              "group inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
              active ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
            )}
          >
            <button
              type="button"
              onClick={() => onApply(v.query)}
              className="font-medium"
              aria-label={`Apply saved view: ${v.name}`}
              aria-pressed={active}
            >
              {v.name}
            </button>
            <button
              type="button"
              onClick={() => removeView(v.id)}
              className="opacity-50 hover:opacity-100"
              aria-label={`Delete saved view: ${v.name}`}
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        );
      })}
      {hasFilters && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <BookmarkPlus className="size-3.5 mr-1" aria-hidden="true" /> Save view
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 space-y-2">
            <p className="text-xs font-medium">Save current filters as a view</p>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
              }}
              placeholder="View name, e.g. Hot · India"
              className="h-8 text-sm"
              aria-label="Saved view name"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={!name.trim()}>
                Save
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export default SavedViewsBar;
