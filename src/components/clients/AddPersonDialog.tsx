import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { PersonRole } from "@/lib/casePeople";
import { logActivity } from "@/lib/activity";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string;
  onAdded: () => void;
}

export const AddPersonDialog = ({ open, onOpenChange, clientId, onAdded }: Props) => {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<PersonRole>("co_applicant");
  const [relationship, setRelationship] = useState("");
  const [dob, setDob] = useState("");
  const [passport, setPassport] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setFullName(""); setRole("co_applicant"); setRelationship(""); setDob(""); setPassport("");
  };

  const onSave = async () => {
    if (!fullName.trim()) { toast.error("Full name is required"); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from("case_people").insert({
        client_id: clientId,
        role,
        full_name: fullName.trim(),
        relationship: relationship.trim() || null,
        date_of_birth: dob || null,
        passport_number: passport.trim() || null,
      }).select().single();
      if (error) throw error;
      await logActivity("case.person_added", "client", clientId, {
        person_id: data.id, role, full_name: fullName.trim(),
      });
      toast.success(`Added ${fullName.trim()}`);
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
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Full name *</Label>
            <Input autoFocus value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Anjali Sharma" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as PersonRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="co_applicant">Co-applicant</SelectItem>
                  <SelectItem value="dependant">Dependant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Relationship</Label>
              <Input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="spouse, son, daughter…" />
            </div>
          </div>
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