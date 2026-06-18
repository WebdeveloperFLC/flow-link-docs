import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";
import {
  fetchEligiblePrimaryUsers,
  logLeadPrimaryUserChange,
  mergePrimaryUserOptionsWithSelf,
  resolvePrimaryUserName,
  type PrimaryUserOption,
} from "@/lib/leadAssignment";

/**
 * Primary user (lead owner) — assigned_counselor_id.
 * Filtered by branch + department; logs assignment changes to activity.
 */
export const LeadOwnerCard = ({
  leadId,
  assignedCounselorId,
  branch,
  department,
  convertedClientId,
  onChanged,
  compact = false,
}: {
  leadId: string;
  assignedCounselorId: string | null;
  branch?: string | null;
  department?: string | null;
  convertedClientId?: string | null;
  onChanged: () => void;
  compact?: boolean;
}) => {
  const { isAdmin, user } = useAuth();
  const [eligible, setEligible] = useState<PrimaryUserOption[]>([]);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [value, setValue] = useState<string>(assignedCounselorId ?? "");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setValue(assignedCounselorId ?? "");
  }, [assignedCounselorId]);

  useEffect(() => {
    resolvePrimaryUserName(assignedCounselorId).then(setCurrentName);
  }, [assignedCounselorId]);

  useEffect(() => {
    if (!branch?.trim() || !department?.trim()) {
      setEligible([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchEligiblePrimaryUsers({ branchName: branch, departmentName: department })
      .then((rows) => {
        if (!cancelled) setEligible(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branch, department]);

  const options = useMemo(
    () => mergePrimaryUserOptionsWithSelf(eligible, value || null, user?.id ?? null, currentName),
    [eligible, value, user?.id, currentName],
  );

  const canChange = isAdmin || (!!user && assignedCounselorId === user.id) || !assignedCounselorId;

  const save = async () => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({ assigned_counselor_id: value || null })
        .eq("id", leadId);
      if (error) throw error;
      if (convertedClientId) {
        const ownerId = value || null;
        const { error: clientErr } = await supabase
          .from("clients")
          .update({
            assigned_counselor_id: ownerId,
            owner_id: ownerId,
          })
          .eq("id", convertedClientId);
        if (clientErr) throw clientErr;
      }
      await logLeadPrimaryUserChange({
        leadId,
        clientId: convertedClientId ?? null,
        previousUserId: assignedCounselorId,
        newUserId: value || null,
        previousName: currentName,
      });
      toast.success(value ? "Primary user updated" : "Lead unassigned");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Primary User</div>
        {canChange ? (
          <div className="flex items-center gap-2">
            <Select value={value} onValueChange={setValue} disabled={loading && !options.length}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={loading ? "Loading…" : currentName ?? "Unassigned"} />
              </SelectTrigger>
              <SelectContent>
                {options.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={busy || value === (assignedCounselorId ?? "")} onClick={save}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        ) : (
          <div className="text-sm">{currentName ?? <span className="text-muted-foreground">Unassigned</span>}</div>
        )}
        {(!branch || !department) && (
          <p className="text-xs text-muted-foreground">Set branch and department on the lead to filter eligible users.</p>
        )}
      </div>
    );
  }

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
          <Select value={value} onValueChange={setValue} disabled={loading && !options.length}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={loading ? "Loading…" : "Select primary user"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={busy || value === (assignedCounselorId ?? "")} onClick={save}>
            {busy ? "Saving…" : assignedCounselorId ? "Transfer" : "Assign"}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Only an admin or the current owner can transfer this lead.</p>
      )}
      {(!branch || !department) && (
        <p className="text-xs text-muted-foreground">Set branch and department to filter eligible users.</p>
      )}
    </div>
  );
};
