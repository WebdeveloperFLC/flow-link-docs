import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMasterLabels } from "@/lib/masters";

export interface ExtraItem {
  id: string;
  name: string;
  mandatory: boolean;
  notes?: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const AddDocTypeDialog = ({
  open,
  onOpenChange,
  existingTypes,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existingTypes: string[];
  onAdd: (item: ExtraItem) => Promise<void> | void;
}) => {
  const [type, setType] = useState<string>("");
  const [mandatory, setMandatory] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const DOCUMENT_TYPES = useMasterLabels("document_types");

  const reset = () => {
    setType(""); setMandatory(false); setNotes("");
  };

  const choices = DOCUMENT_TYPES.filter((d) => !existingTypes.includes(d) || d === "Other");

  const submit = async () => {
    if (!type) return;
    setBusy(true);
    try {
      await onAdd({ id: uid(), name: type, mandatory, notes: notes.trim() || undefined });
      reset();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a document requirement</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Document type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="e.g. Divorce Certificate" /></SelectTrigger>
              <SelectContent>
                {choices.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Already-listed document types from the template are hidden.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. certified translation required" />
          </div>
          <label className="flex items-center justify-between rounded border p-3">
            <div>
              <div className="text-sm font-medium">Required for this client</div>
              <div className="text-[11px] text-muted-foreground">Off = optional, won't block binder generation.</div>
            </div>
            <Switch checked={mandatory} onCheckedChange={setMandatory} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!type || busy} className="gradient-brand text-primary-foreground">
            {busy ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};