import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ServiceCatalogueItem } from "@/lib/leads";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  catalogue: ServiceCatalogueItem[];
  onSelect: (item: ServiceCatalogueItem) => void;
  excludeIds?: Set<string>;
}

export default function ServiceLibraryPickerDialog({
  open,
  onOpenChange,
  catalogue,
  onSelect,
  excludeIds,
}: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return catalogue
      .filter((s) => s.is_active && s.pricing_type !== "FREE")
      .filter((s) => !excludeIds?.has(s.id))
      .filter((s) => !term || [s.service_name, s.service_code, s.master_key, s.country_tag]
        .some((v) => String(v ?? "").toLowerCase().includes(term)))
      .slice(0, 200);
  }, [catalogue, q, excludeIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add service from library</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search services…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        </div>
        <ScrollArea className="h-[320px] border rounded-md">
          <ul className="divide-y">
            {filtered.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted/60 text-sm"
                  onClick={() => {
                    onSelect(s);
                    onOpenChange(false);
                    setQ("");
                  }}
                >
                  <div className="font-medium">{s.service_name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {s.master_key.replace(/_/g, " ")}
                    {s.country_tag ? ` · ${s.country_tag}` : ""}
                    {s.pricing_type === "ON_REQUEST" ? " · fee on request" : s.fee_inr ? ` · ₹${s.fee_inr}` : ""}
                  </div>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="p-4 text-sm text-muted-foreground">No matching services.</li>
            )}
          </ul>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
