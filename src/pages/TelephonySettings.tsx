import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BrowserPhonePanel } from "@/components/telephony/BrowserPhonePanel";

interface AgentRow {
  id: string;
  user_id: string;
  role: string;
  telecmi_agent_id: string | null;
  sbc_user_id: string | null;
  sbc_password_set: boolean;
  is_available: boolean;
  is_on_break: boolean;
  profile?: { full_name: string | null; email: string | null } | null;
}

const TelephonySettings = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sbcUserDrafts, setSbcUserDrafts] = useState<Record<string, string>>({});
  const [sbcPwdDrafts, setSbcPwdDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: agents, error } = await supabase
      .from("telephony_agents")
      .select("id, user_id, role, telecmi_agent_id, sbc_user_id, sbc_password, is_available, is_on_break")
      .order("created_at", { ascending: true });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const userIds = (agents ?? []).map((a) => a.user_id);
    let profiles: Record<string, { full_name: string | null; email: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      (profs ?? []).forEach((p: any) => {
        profiles[p.id] = { full_name: p.full_name, email: p.email };
      });
    }
    const merged: AgentRow[] = (agents ?? []).map((a: any) => ({
      id: a.id,
      user_id: a.user_id,
      role: a.role,
      telecmi_agent_id: a.telecmi_agent_id,
      sbc_user_id: a.sbc_user_id ?? null,
      sbc_password_set: !!a.sbc_password,
      is_available: a.is_available,
      is_on_break: a.is_on_break,
      profile: profiles[a.user_id] ?? null,
    }));
    setRows(merged);
    setDrafts(Object.fromEntries(merged.map((a) => [a.id, a.telecmi_agent_id ?? ""])));
    setSbcUserDrafts(Object.fromEntries(merged.map((a) => [a.id, a.sbc_user_id ?? ""])));
    setSbcPwdDrafts(Object.fromEntries(merged.map((a) => [a.id, ""])));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [isAdmin]);

  if (authLoading) return null;
  // Page is open to any signed-in user so counselors can see the browser-phone panel.
  // Per-counselor management cards below are gated to admins only.

  const saveAgentId = async (row: AgentRow) => {
    const value = (drafts[row.id] ?? "").trim();
    setSavingId(row.id);
    const { error } = await supabase
      .from("telephony_agents")
      .update({ telecmi_agent_id: value || null })
      .eq("id", row.id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("TeleCMI agent ID saved");
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, telecmi_agent_id: value || null } : r)),
    );
  };

  const saveSbcCreds = async (row: AgentRow) => {
    const userId = (sbcUserDrafts[row.id] ?? "").trim();
    const pwd = (sbcPwdDrafts[row.id] ?? "").trim();
    const update: Record<string, unknown> = {};
    if (userId !== (row.sbc_user_id ?? "")) update.sbc_user_id = userId || null;
    if (pwd.length > 0) update.sbc_password = pwd;
    if (Object.keys(update).length === 0) {
      toast.message("Nothing to save");
      return;
    }
    setSavingId(row.id);
    const { error } = await supabase.from("telephony_agents").update(update).eq("id", row.id);
    setSavingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("SBC credentials saved");
    setSbcPwdDrafts((d) => ({ ...d, [row.id]: "" }));
    setRows((prev) => prev.map((r) =>
      r.id === row.id
        ? { ...r, sbc_user_id: userId || null, sbc_password_set: pwd.length > 0 ? true : r.sbc_password_set }
        : r,
    ));
  };

  const toggleField = async (
    row: AgentRow,
    field: "is_available" | "is_on_break",
    next: boolean,
  ) => {
    const update: any = { [field]: next };
    const { error } = await supabase
      .from("telephony_agents")
      .update(update)
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, [field]: next } : r)));
  };

  return (
    <AppLayout>
      <PageHeader
        title="Telephony Settings"
        description="Configure each counselor's TeleCMI agent ID and availability."
      />
      <div className="p-6 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading agents…
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            No telephony agents yet. Create one by inserting a row in <code>telephony_agents</code> for a user.
          </Card>
        ) : (
          rows.map((row) => (
            <Card key={row.id} className="p-4">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div className="space-y-3">
                  <div>
                    <div className="font-medium">
                      {row.profile?.full_name || row.profile?.email || row.user_id}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.profile?.email} · role: {row.role}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`tcmi-${row.id}`}>TeleCMI agent ID</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`tcmi-${row.id}`}
                        value={drafts[row.id] ?? ""}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [row.id]: e.target.value }))
                        }
                        placeholder="e.g. agent_123"
                      />
                      <Button
                        onClick={() => saveAgentId(row)}
                        disabled={
                          savingId === row.id ||
                          (drafts[row.id] ?? "") === (row.telecmi_agent_id ?? "")
                        }
                      >
                        {savingId === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 md:items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={row.is_available}
                      onCheckedChange={(v) => toggleField(row, "is_available", v)}
                    />
                    Available
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={row.is_on_break}
                      onCheckedChange={(v) => toggleField(row, "is_on_break", v)}
                    />
                    On break
                  </label>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </AppLayout>
  );
};

export default TelephonySettings;