import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getMyPortalClientId } from "@/lib/portal";

export default function PortalSettings() {
  return <PortalLayout render={({ clientId }) => <Inner clientId={clientId}/>}/>;
}
function Inner({ clientId }: { clientId: string | null }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [prefs, setPrefs] = useState({ email_status_updates: true, email_documents: true, email_payments: true, email_messages: true });
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle().then(({ data }) => setName(data?.full_name ?? ""));
  }, [user]);
  useEffect(() => {
    if (!clientId) return;
    supabase.from("client_notification_prefs").select("*").eq("client_id", clientId).maybeSingle()
      .then(({ data }) => { if (data) setPrefs(data as any); });
  }, [clientId]);
  const savePrefs = async () => {
    if (!clientId) return;
    const { error } = await supabase.from("client_notification_prefs").upsert({ client_id: clientId, ...prefs });
    if (error) toast.error(error.message); else toast.success("Preferences saved");
  };
  const saveProfile = async () => {
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user!.id);
    if (error) toast.error(error.message); else toast.success("Saved");
  };
  const changePw = async () => {
    if (pw.length < 6) { toast.error("Password too short"); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast.error(error.message); else { toast.success("Password changed"); setPw(""); }
  };
  return (
    <div className="space-y-6 max-w-xl">
      <div><h1 className="text-2xl font-bold">Profile & Settings</h1></div>
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold">Profile</h3>
        <div><Label>Email</Label><Input value={user?.email ?? ""} disabled/></div>
        <div><Label>Full name</Label><Input value={name} onChange={(e)=>setName(e.target.value)}/></div>
        <Button onClick={saveProfile}>Save</Button>
      </Card>
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold">Change password</h3>
        <div><Label>New password</Label><Input type="password" value={pw} onChange={(e)=>setPw(e.target.value)}/></div>
        <Button onClick={changePw}>Update password</Button>
      </Card>
      {clientId && (
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold">Email notifications</h3>
          <p className="text-xs text-muted-foreground">Choose which alerts you'd like to receive by email. You'll always see them in the portal Notifications page.</p>
          {([
            ["email_status_updates", "Application status updates"],
            ["email_documents", "Document requests & approvals"],
            ["email_payments", "Payment due & receipts"],
            ["email_messages", "Messages from your team"],
          ] as const).map(([k, label]) => (
            <div key={k} className="flex items-center justify-between">
              <Label className="text-sm font-normal">{label}</Label>
              <Switch checked={(prefs as any)[k]} onCheckedChange={(v)=>setPrefs({...prefs, [k]: v})}/>
            </div>
          ))}
          <Button onClick={savePrefs}>Save preferences</Button>
        </Card>
      )}
    </div>
  );
}
