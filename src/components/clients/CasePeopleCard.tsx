import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Trash2, UserCircle2, AlertTriangle } from "lucide-react";
import { fetchCasePeople, sortRoster, ROLE_LABEL, type CasePerson } from "@/lib/casePeople";
import { AddPersonDialog } from "./AddPersonDialog";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";

interface Props {
  clientId: string;
  canEdit: boolean;
  isAdmin: boolean;
  onChange?: (roster: CasePerson[]) => void;
  refreshKey?: number;
}

export const CasePeopleCard = ({ clientId, canEdit, isAdmin, onChange, refreshKey }: Props) => {
  const [roster, setRoster] = useState<CasePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await fetchCasePeople(clientId);
      const sorted = sortRoster(list);
      setRoster(sorted);
      onChange?.(sorted);
    } finally {
      setLoading(false);
    }
  };

  // Reload when client or external refreshKey changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [clientId, refreshKey]);

  const onArchive = async (p: CasePerson) => {
    if (p.role === "applicant") { toast.error("Cannot remove the applicant"); return; }
    if (!confirm(`Remove ${p.full_name} from this case? Their documents will stay archived.`)) return;
    const { error } = await supabase
      .from("case_people")
      .update({ is_archived: true })
      .eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    await logActivity("case.person_archived", "client", clientId, { person_id: p.id, full_name: p.full_name });
    toast.success(`Removed ${p.full_name}`);
    load();
  };

  const isMulti = roster.length >= 2;
  const hasApplicant = roster.some((p) => p.role === "applicant");

  return (
    <Card className="overflow-hidden shadow-elev-sm">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <div>
            <div className="font-semibold">Family on this case</div>
            <div className="text-xs text-muted-foreground">
              {loading ? "Loading…" : `${roster.length} ${roster.length === 1 ? "member" : "members"}`}
              {isMulti && " · documents are assigned per person on upload"}
            </div>
          </div>
        </div>
        {canEdit && (
          <Button
            size="sm"
            variant={!hasApplicant && !loading ? "default" : "outline"}
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-3.5 mr-1" /> Add family
          </Button>
        )}
      </div>
      {!loading && !hasApplicant && (
        <div className="px-6 py-3 bg-destructive/5 border-b border-destructive/20 flex items-start gap-2 text-sm">
          <AlertTriangle className="size-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <div className="font-medium text-destructive">No applicant on file</div>
            <div className="text-xs text-muted-foreground">
              Add the principal applicant before uploading documents.
            </div>
          </div>
        </div>
      )}
      <div className="divide-y">
        {roster.map((p) => (
          <div key={p.id} className="px-6 py-3 flex items-center gap-3">
            <UserCircle2 className={`size-5 shrink-0 ${p.role === "applicant" ? "text-primary" : "text-muted-foreground"}`} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                {p.full_name}
                <span className={`text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded ${
                  p.role === "applicant" ? "bg-primary/10 text-primary"
                  : p.role === "co_applicant" ? "bg-secondary/10 text-secondary"
                  : p.role === "sponsor" ? "bg-success/10 text-success"
                  : p.role === "co_sponsor" ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"
                }`}>
                  {ROLE_LABEL[p.role]}
                </span>
                {p.relationship && <span className="text-xs text-muted-foreground">· {p.relationship}</span>}
              </div>
              <div className="text-xs text-muted-foreground flex gap-3 mt-0.5">
                {p.date_of_birth && <span>DOB {p.date_of_birth}</span>}
                {p.passport_number && <span>Passport {p.passport_number}</span>}
              </div>
            </div>
            {isAdmin && p.role !== "applicant" && (
              <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => onArchive(p)} title="Remove from case">
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
        {!loading && roster.length === 0 && (
          <div className="px-6 py-6 text-sm text-muted-foreground text-center">
            No family members on this case yet — use Add family to add a co-applicant or dependant.
          </div>
        )}
      </div>
      <AddPersonDialog open={addOpen} onOpenChange={setAddOpen} clientId={clientId} onAdded={load} roster={roster} />
    </Card>
  );
};

export default CasePeopleCard;