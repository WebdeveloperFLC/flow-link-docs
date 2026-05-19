import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash2, UserPlus2, Baby, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  fetchFamilyMembers,
  upsertFamilyMember,
  deleteFamilyMember,
  createLeadFromFamilyMember,
  type FamilyMember,
} from "@/lib/clientRegistration";
import { fetchServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";

interface Props {
  primaryClientId: string | null;
  primaryLeadId: string | null;
  onChange?: (members: FamilyMember[]) => void;
}

export const FamilyMembersSection = ({ primaryClientId, primaryLeadId, onChange }: Props) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [visaCatalogue, setVisaCatalogue] = useState<ServiceCatalogueItem[]>([]);

  useEffect(() => {
    fetchServiceCatalogue("visa_immigration").then(setVisaCatalogue).catch(() => setVisaCatalogue([]));
  }, []);

  useEffect(() => {
    if (!primaryClientId && !primaryLeadId) return;
    fetchFamilyMembers({ client_id: primaryClientId, lead_id: primaryLeadId }).then((m) => {
      setMembers(m);
      onChange?.(m);
    });
  }, [primaryClientId, primaryLeadId]);

  const emit = (next: FamilyMember[]) => { setMembers(next); onChange?.(next); };

  const handleAdd = async (relationship: FamilyMember["relationship"]) => {
    if (!primaryClientId && !primaryLeadId) {
      toast.error("Save the client first (enter first/last name) before adding family members.");
      return;
    }
    try {
      const created = await upsertFamilyMember(null, {
        relationship,
        first_name: "",
        last_name: "",
        application_mode: "together",
        visa_services: [],
        primary_client_id: primaryClientId,
        primary_lead_id: primaryLeadId,
      });
      emit([...members, created]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add");
    }
  };

  const patch = async (id: string, p: Partial<FamilyMember>) => {
    const optimistic = members.map((m) => (m.id === id ? { ...m, ...p } : m));
    emit(optimistic);
    try {
      await upsertFamilyMember(id, p);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this family member?")) return;
    try {
      await deleteFamilyMember(id);
      emit(members.filter((m) => m.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed (admin only)");
    }
  };

  const convertToLead = async (id: string) => {
    try {
      const lead = await createLeadFromFamilyMember(id);
      toast.success(`New lead ${lead.lead_number} created`);
      const refreshed = await fetchFamilyMembers({ client_id: primaryClientId, lead_id: primaryLeadId });
      emit(refreshed);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create lead");
    }
  };

  const toggleVisaService = (m: FamilyMember, code: string) => {
    const cur = m.visa_services ?? [];
    const next = cur.includes(code) ? cur.filter((x) => x !== code) : [...cur, code];
    patch(m.id, { visa_services: next });
  };

  return (
    <Card className="p-4 sm:p-6 space-y-4">
      <div>
        <h3 className="font-semibold">Family Members</h3>
        <p className="text-xs text-muted-foreground">
          Add spouse or dependents if applying together or planning to follow.
        </p>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => handleAdd("spouse")}>
          <UserPlus2 className="h-3.5 w-3.5 mr-1" /> Add Spouse
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => handleAdd("child")}>
          <Baby className="h-3.5 w-3.5 mr-1" /> Add Dependent
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => handleAdd("parent")}>
          + Parent
        </Button>
      </div>

      <div className="space-y-4">
        {members.length === 0 && (
          <div className="border border-dashed rounded-md p-6 text-center text-sm text-muted-foreground">
            No family members added.
          </div>
        )}
        {members.map((m) => (
          <Card key={m.id} className="p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="capitalize">{m.relationship}</Badge>
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(m.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input
                  value={m.first_name}
                  onChange={(e) => emit(members.map((x) => (x.id === m.id ? { ...x, first_name: e.target.value } : x)))}
                  onBlur={(e) => patch(m.id, { first_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input
                  value={m.last_name}
                  onChange={(e) => emit(members.map((x) => (x.id === m.id ? { ...x, last_name: e.target.value } : x)))}
                  onBlur={(e) => patch(m.id, { last_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <Input type="date" value={m.date_of_birth ?? ""} onChange={(e) => patch(m.id, { date_of_birth: e.target.value || null })} />
              </div>
              <div className="space-y-1.5">
                <Label>Passport Number</Label>
                <Input value={m.passport_number ?? ""} onChange={(e) => emit(members.map((x) => (x.id === m.id ? { ...x, passport_number: e.target.value } : x)))} onBlur={(e) => patch(m.id, { passport_number: e.target.value || null })} />
              </div>
              <div className="space-y-1.5">
                <Label>Passport Expiry</Label>
                <Input type="date" value={m.passport_expiry ?? ""} onChange={(e) => patch(m.id, { passport_expiry: e.target.value || null })} />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs uppercase tracking-wide">Application Timing</Label>
              <RadioGroup
                value={m.application_mode}
                onValueChange={(v) => patch(m.id, { application_mode: v as FamilyMember["application_mode"] })}
                className="space-y-1"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="together" id={`mode-together-${m.id}`} />
                  <Label htmlFor={`mode-together-${m.id}`} className="font-normal text-sm">Applying together (included in this case and invoice)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="separate_later" id={`mode-later-${m.id}`} />
                  <Label htmlFor={`mode-later-${m.id}`} className="font-normal text-sm">Will apply separately later (saved for future, not on invoice)</Label>
                </div>
              </RadioGroup>
            </div>

            {m.application_mode === "together" && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs uppercase tracking-wide">Visa services for this person</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-48 overflow-y-auto border rounded-md p-2">
                  {visaCatalogue.map((s) => {
                    const code = s.service_code || s.id;
                    const checked = (m.visa_services ?? []).includes(code);
                    return (
                      <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/40 px-1.5 py-1 rounded">
                        <Checkbox checked={checked} onCheckedChange={() => toggleVisaService(m, code)} />
                        <span className="truncate">{s.service_name}</span>
                        {s.country_tag && <Badge variant="outline" className="ml-auto text-[10px]">{s.country_tag}</Badge>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {m.application_mode === "separate_later" && (
              <div className="pt-2 border-t">
                {m.separate_lead_id ? (
                  <Link to={`/leads/${m.separate_lead_id}`} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                    View lead <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => convertToLead(m.id)}>
                    Convert to New Lead
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-1.5 pt-2 border-t">
              <Label>Notes</Label>
              <Textarea
                value={m.notes ?? ""}
                onChange={(e) => emit(members.map((x) => (x.id === m.id ? { ...x, notes: e.target.value } : x)))}
                onBlur={(e) => patch(m.id, { notes: e.target.value || null })}
                rows={2}
              />
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
};