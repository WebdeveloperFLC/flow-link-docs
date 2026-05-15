import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Field { key: string; label: string; required?: boolean; placeholder?: string; type?: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  fields: Field[];
  submitLabel?: string;
  onSubmit: (values: Record<string, string>) => void;
}

export function AddOptionDialog({ open, onOpenChange, title, description, fields, submitLabel = "Add", onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) setValues({});
  }, [open]);

  const submit = () => {
    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <div className="text-xs text-muted-foreground">{description}</div>}
        </DialogHeader>
        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}{f.required && " *"}</Label>
              <Input
                type={f.type ?? "text"}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}