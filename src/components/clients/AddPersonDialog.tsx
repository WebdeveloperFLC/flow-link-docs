import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { PersonRole, CasePerson } from "@/lib/casePeople";
import { logActivity } from "@/lib/activity";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string;
  onAdded: () => void;
  /** Current roster — used to decide whether to offer the Applicant role. */
  roster?: CasePerson[];
}

const RELATIONSHIP_PRESETS = [
  "Spouse",
  "Son",
  "Daughter",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Partner",
  "Guardian",
] as const;
const OTHER = "__other__";

const defaultRelForRole = (role: PersonRole) =>
  role === "co_applicant" ? "Spouse" : role === "dependant" ? "Son" : "";

export const AddPersonDialog = ({ open, onOpenChange, clientId, onAdded, roster = [] }: Props) => {
  const hasApplicant = roster.some((p) => p.role === "applicant" && !p.is_archived);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<PersonRole>(hasApplicant ? "co_applicant" : "applicant");
  const [relationshipPreset, setRelationshipPreset] = useState<string>("Spouse");
  const [relationshipOther, setRelationshipOther] = useState("");
  const [dob, setDob] = useState("");
  const [passport, setPassport] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setFirstName(""); setLastName("");
    setRole(hasApplicant ? "co_applicant" : "applicant");
    setRelationshipPreset("Spouse"); setRelationshipOther("");
    setDob(""); setPassport("");
  };

  const onRoleChange = (v: PersonRole) => {
    setRole(v);
    // Auto-suggest relationship default when role changes (only if user hasn't typed a custom one)
    if (relationshipPreset !== OTHER && v !== "applicant") {
      setRelationshipPreset(defaultRelForRole(v) || "Spouse");
    }
  };

  const onSave = async () => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn || !ln) { toast.error("First and last name are required"); return; }
    const fullName = `${fn} ${ln}`.trim();
    const isApplicant = role === "applicant";
    const relationship = isApplicant
      ? null
      : (relationshipPreset === OTHER ? relationshipOther.trim() : relationshipPreset);
    if (!isApplicant && relationshipPreset === OTHER && !relationship) {
      toast.error("Please specify the relationship");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.from("case_people").insert({
        client_id: clientId,
        role,
        full_name: fullName,
        relationship: relationship || null,
        date_of_birth: dob || null,
        passport_number: passport.trim() || null,
      }).select().single();
      if (error) throw error;
      await logActivity("case.person_added", "client", clientId, {
        person_id: data.id, role, full_name: fullName,
      });
      toast.success(`Added ${fullName}`);
      reset();
      onAdded();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add person");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add person to this case</DialogTitle>
          <DialogDescription>
            {hasApplicant
              ? "Add a co-applicant or dependant. Documents can be assigned per person."
              : "This case has no applicant yet. Add the principal applicant first to enable document uploads."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First name *</Label>
              <Input autoFocus value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Anjali" />
            </div>
            <div className="space-y-1.5">
              <Label>Last name *</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Sharma" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => onRoleChange(v as PersonRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {!hasApplicant && <SelectItem value="applicant">Applicant (principal)</SelectItem>}
                  <SelectItem value="co_applicant">Co-applicant</SelectItem>
                  <SelectItem value="dependant">Dependant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role !== "applicant" && (
              <div className="space-y-1.5">
                <Label>Relationship</Label>
                <Select value={relationshipPreset} onValueChange={setRelationshipPreset}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_PRESETS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                    <SelectItem value={OTHER}>Other…</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {role !== "applicant" && relationshipPreset === OTHER && (
            <div className="space-y-1.5">
              <Label>Specify relationship *</Label>
              <Input
                value={relationshipOther}
                onChange={(e) => setRelationshipOther(e.target.value)}
                placeholder="e.g. Father-in-law"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date of birth</Label>
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Passport #</Label>
              <Input value={passport} onChange={(e) => setPassport(e.target.value)} placeholder="optional" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Add person"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPersonDialog;