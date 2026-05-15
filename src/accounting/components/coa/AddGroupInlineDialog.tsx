import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addGroup } from "../../stores/coaMasterStore";
import { AccountNature } from "../../types/coa";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (code: string) => void;
}

export default function AddGroupInlineDialog({ open, onOpenChange, onCreated }: Props) {
  const [label, setLabel] = useState("");
  const [nature, setNature] = useState<AccountNature>("DEBIT");

  useEffect(() => {
    if (open) { setLabel(""); setNature("DEBIT"); }
  }, [open]);

  const submit = () => {
    const created = addGroup(label, nature);
    if (!created) { toast.error("Group name is required and must be unique"); return; }
    toast.success(`Account group "${created.label}" added`);
    onCreated?.(created.code);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add account group</DialogTitle>
          <DialogDescription>Custom groups become available everywhere accounts are categorized.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Group name</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Contra Assets" autoFocus />
          </div>
          <div className="grid gap-2">
            <Label>Normal balance</Label>
            <Select value={nature} onValueChange={(v) => setNature(v as AccountNature)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DEBIT">Debit</SelectItem>
                <SelectItem value="CREDIT">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Add group</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}