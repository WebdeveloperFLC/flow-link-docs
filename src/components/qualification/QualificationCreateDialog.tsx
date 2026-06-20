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
  const [programCode, setProgramCode] = useState("");
  const [campusName, setCampusName] = useState("");
  const [intakeTerm, setIntakeTerm] = useState("");
  const [intakeYear, setIntakeYear] = useState("");
  const [studyLevel, setStudyLevel] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [tuitionFee, setTuitionFee] = useState("");
  const [tuitionCurrency, setTuitionCurrency] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void supabase
      .from("upi_institutions")
      .select("id, name")
      .order("name")
      .then(({ data }) => setInstitutions((data ?? []) as InstitutionOption[]));
  }, [open]);

  const resetForm = () => {
    setInstitutionId("");
    setProgramName("");
    setProgramCode("");
    setCampusName("");
    setIntakeTerm("");
    setIntakeYear("");
    setStudyLevel("");
    setDurationMonths("");
    setTuitionFee("");
    setTuitionCurrency("");
  };

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
        programCode: programCode.trim() || null,
        campusName: campusName.trim() || null,
        intakeYear: intakeYear ? Number(intakeYear) : null,
        studyLevel: studyLevel.trim() || null,
        durationMonths: durationMonths ? Number(durationMonths) : null,
        tuitionFee: tuitionFee ? Number(tuitionFee) : null,
        tuitionCurrency: tuitionCurrency.trim() || null,
      });
      toast.success("Application created");
      onCreated(id);
      onOpenChange(false);
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create application");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Student Application</DialogTitle>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Program code (optional)</Label>
              <Input value={programCode} onChange={(e) => setProgramCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Campus (optional)</Label>
              <Input value={campusName} onChange={(e) => setCampusName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Intake term</Label>
              <Input
                placeholder="e.g. Fall 2026"
                value={intakeTerm}
                onChange={(e) => setIntakeTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Intake year (optional)</Label>
              <Input
                type="number"
                min={2000}
                max={2100}
                value={intakeYear}
                onChange={(e) => setIntakeYear(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Study level (optional)</Label>
              <Input
                placeholder="e.g. PG Diploma"
                value={studyLevel}
                onChange={(e) => setStudyLevel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration months (optional)</Label>
              <Input
                type="number"
                min={1}
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tuition fee snapshot (optional)</Label>
              <Input
                type="number"
                min={0}
                value={tuitionFee}
                onChange={(e) => setTuitionFee(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency (optional)</Label>
              <Select value={tuitionCurrency || "__none__"} onValueChange={(v) => setTuitionCurrency(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not set</SelectItem>
                  {["CAD", "USD", "GBP", "AUD", "INR"].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Institution name, city, and destination country are captured automatically from the
            institution master. Deposit and tuition payment tracking are not created at this step.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? "Creating…" : "Create Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
