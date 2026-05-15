import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { usePettyCash } from "../../stores/pettyCashStore";

interface Props { open: boolean; onOpenChange: (v: boolean) => void }

export function ManageCategoriesDialog({ open, onOpenChange }: Props) {
  const { categories, addCategory, updateCategory } = usePettyCash();
  const [newLabel, setNewLabel] = useState("");

  const onAdd = () => {
    const label = newLabel.trim();
    if (!label) { toast.error("Category name required"); return; }
    addCategory(label);
    setNewLabel("");
    toast.success("Category added");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage expense categories</DialogTitle>
          <div className="text-xs text-muted-foreground">Add, rename, or disable petty-cash categories. There is no limit on how many you create.</div>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Office plants" onKeyDown={(e) => e.key === "Enter" && onAdd()} />
            <Button onClick={onAdd}><Plus className="size-4 mr-1.5" /> Add</Button>
          </div>

          <div className="max-h-[320px] overflow-y-auto border rounded-md divide-y">
            {categories.map(c => (
              <div key={c.value} className="flex items-center gap-3 px-3 py-2">
                <Input
                  value={c.label}
                  onChange={(e) => updateCategory(c.value, { label: e.target.value })}
                  className="h-8 text-sm border-transparent hover:border-border focus:border-border"
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Label className="text-xs">Active</Label>
                  <Switch checked={!c.disabled} onCheckedChange={(v) => updateCategory(c.value, { disabled: !v })} />
                </div>
              </div>
            ))}
            {categories.length === 0 && <div className="px-3 py-6 text-center text-sm text-muted-foreground">No categories yet.</div>}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}