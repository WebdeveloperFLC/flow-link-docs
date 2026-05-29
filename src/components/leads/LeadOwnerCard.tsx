import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";

interface Opt { id: string; name: string; }

/**
 * Shows the lead's primary user (assigned counselor) and lets an admin or the
 * current owner re-assign / transfer it to another team member.
 * Writes to leads.assigned_counselor_id.
 */
export const LeadOwnerCard = ({
  leadId,
  assignedCounselorId,
  onChanged,
}: {
  leadId: string;
  assignedCounselorId: string | null;
  onChanged: () => void;
}) => {
  const { isAdmin, user } = useAuth();
  const [people, setPeople] = useState<Opt[]>([]);
  const [value, setValue] = useState<string>(assignedCounselorId ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setValue(assignedCounselorId ?? ""); }, [assignedCounselorId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email").order("full_name");
      setPeople(((data ?? []) as any[]).map((p) => ({ id: p.id, name: p.full_name ?? p.email ?? p.id })));
    })();
  }, []);

  const currentName = people.find((p) => p.id === assignedCounselorId)?.name ?? null;
  // Only admin or the current owner may transfer.
  const canChange = isAdmin || (!!user && assignedCounselorId === user.id) || !assignedCounselorId;

  const save = async () => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({ assigned_counselor_id: value || null })
        .eq("id", leadId);
      if (error) throw error;
      toast.success(value ? "Lead assigned" : "Lead unassigned");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <UserCheck className="size-4 text-primary" />
        <h3 className="font-semibold text-sm">Primary user</h3>
      </div>

      <div className="text-sm">
        {currentName ? (
          <span>{currentName}</span>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        )}
      </div>

      {canChange ? (
        <div className="flex items-center gap-2">
          <select
            className="flex-1 border rounded-md h-9 px-2 bg-background text-sm"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Button size="sm" disabled={busy || value === (assignedCounselorId ?? "")} onClick={save}>
            {busy ? "Saving…" : (assignedCounselorId ? "Transfer" : "Assign")}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Only an admin or the current owner can transfer this lead.</p>
      )}
    </div>
  );
};
