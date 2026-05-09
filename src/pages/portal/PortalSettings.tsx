import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function PortalSettings() {
  return <PortalLayout render={() => <Inner/>}/>;
}
function Inner() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle().then(({ data }) => setName(data?.full_name ?? ""));
  }, [user]);
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
    </div>
  );
}
