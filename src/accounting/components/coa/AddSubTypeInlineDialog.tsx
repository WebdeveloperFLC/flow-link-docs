import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addSubType, useTypes } from "../../stores/coaMasterStore";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTypeCode?: string;
  onCreated?: (code: string) => void;
}

export default function AddSubTypeInlineDialog({ open, onOpenChange, defaultTypeCode, onCreated }: Props) {
  const types = useTypes();
  const [label, setLabel] = useState("");
  const [typeCode, setTypeCode] = useState(defaultTypeCode ?? types[0]?.code ?? "");

  useEffect(() => {
    if (open) {
      setLabel("");
      setTypeCode(defaultTypeCode ?? types[0]?.code ?? "");
    }
  }, [open, defaultTypeCode, types]);

  const submit = () => {
    const created = addSubType(label, typeCode);
    if (!created) { toast.error("Sub-type name is required and must be unique within the type"); return; }
    toast.success(`Sub-type "${created.label}" added`);
    onCreated?.(created.code);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add sub-type</DialogTitle>
          <DialogDescription>Sub-types refine an account type (for example: AR · Students).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Account type</Label>
            <Select value={typeCode} onValueChange={setTypeCode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {types.map((t) => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Sub-type name</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Students" autoFocus />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Add sub-type</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}