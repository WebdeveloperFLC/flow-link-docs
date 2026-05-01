import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { createSection } from "@/lib/sections";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export const AddSectionDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = label.trim();
    if (!trimmed) { toast.error("Enter a section name"); return; }
    setBusy(true);
    try {
      const created = await createSection(trimmed);
      if (!created) { toast.error("Could not create section. Admins only."); return; }
      toast.success(`Section "${created.label}" added`);
      setLabel("");
      onOpenChange(false);
      onCreated();
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New section</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="section-label" className="text-xs">Section name</Label>
            <Input
              id="section-label"
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder="e.g. Travel History"
            />
            <p className="text-[11px] text-muted-foreground">
              Sections appear on every client. There is no limit on how many you can create.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !label.trim()}>
            {busy ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : null}
            Create section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};