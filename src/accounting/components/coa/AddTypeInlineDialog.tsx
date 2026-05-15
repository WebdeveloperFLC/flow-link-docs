import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addType, useGroups } from "../../stores/coaMasterStore";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultGroupCode?: string;
  onCreated?: (code: string) => void;
}

export default function AddTypeInlineDialog({ open, onOpenChange, defaultGroupCode, onCreated }: Props) {
  const groups = useGroups();
  const [label, setLabel] = useState("");
  const [groupCode, setGroupCode] = useState(defaultGroupCode ?? groups[0]?.code ?? "");

  useEffect(() => {
    if (open) {
      setLabel("");
      setGroupCode(defaultGroupCode ?? groups[0]?.code ?? "");
    }
  }, [open, defaultGroupCode, groups]);

  const submit = () => {
    const created = addType(label, groupCode);
    if (!created) { toast.error("Type name is required and must be unique within the group"); return; }
    toast.success(`Account type "${created.label}" added`);
    onCreated?.(created.code);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add account type</DialogTitle>
          <DialogDescription>Types group similar accounts inside an account group.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Account group</Label>
            <Select value={groupCode} onValueChange={setGroupCode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {groups.map((g) => <SelectItem key={g.code} value={g.code}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Type name</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Digital Wallets" autoFocus />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Add type</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}