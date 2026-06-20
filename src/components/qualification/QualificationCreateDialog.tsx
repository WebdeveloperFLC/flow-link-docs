import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { upsertClientQualification } from "@/lib/qualification/qualificationApi";
import { toast } from "sonner";

type InstitutionOption = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  caseId: string;
  onCreated: (qualificationId: string) => void;
};

export function QualificationCreateDialog({
  open,
  onOpenChange,
  clientId,
  caseId,
  onCreated,
}: Props) {
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [institutionId, setInstitutionId] = useState("");
  const [programName, setProgramName] = useState("");
  const [intakeTerm, setIntakeTerm] = useState("");
  const [depositRequired, setDepositRequired] = useState("");
  const [tuitionTotal, setTuitionTotal] = useState("");
  const [currency, setCurrency] = useState("CAD");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void supabase
      .from("upi_institutions")
      .select("id, name")
      .order("name")
      .then(({ data }) => setInstitutions((data ?? []) as InstitutionOption[]));
  }, [open]);

  const handleSubmit = async () => {
    if (!institutionId || !intakeTerm.trim()) {
      toast.error("Institution and intake term are required");
      return;
    }
    setSaving(true);
    try {
      const id = await upsertClientQualification({
        clientId,
        clientServiceCaseId: caseId,
        institutionId,
        intakeTerm: intakeTerm.trim(),
        programName: programName.trim() || null,
        depositRequired: Number(depositRequired) || 0,
        tuitionTotal: Number(tuitionTotal) || 0,
        currency,
      });
      toast.success("Qualification created");
      onCreated(id);
      onOpenChange(false);
      setInstitutionId("");
      setProgramName("");
      setIntakeTerm("");
      setDepositRequired("");
      setTuitionTotal("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create qualification");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create institution qualification</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Institution</Label>
            <Select value={institutionId} onValueChange={setInstitutionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Program</Label>
            <Input value={programName} onChange={(e) => setProgramName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Intake term</Label>
            <Input
              placeholder="e.g. Fall 2026"
              value={intakeTerm}
              onChange={(e) => setIntakeTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Deposit required</Label>
              <Input
                type="number"
                min={0}
                value={depositRequired}
                onChange={(e) => setDepositRequired(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Total tuition</Label>
              <Input
                type="number"
                min={0}
                value={tuitionTotal}
                onChange={(e) => setTuitionTotal(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["CAD", "USD", "GBP", "AUD", "INR"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
