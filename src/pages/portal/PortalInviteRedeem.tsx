import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function PortalInviteRedeem() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) { setValid(false); return; }
    (async () => {
      const { data } = await supabase.from("client_portal_invites")
        .select("email, used_at, revoked_at, expires_at")
        .eq("token", token).maybeSingle();
      // Anon may not be able to SELECT — fallback: just allow form
      if (data) {
        setEmail(data.email);
        const ok = !data.used_at && !data.revoked_at && new Date(data.expires_at) > new Date();
        setValid(ok);
      } else {
        setValid(true); // RLS may hide it; let server validate on submit
      }
    })();
  }, [token]);

  const submit = async () => {
    if (pw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("client-portal-invite-redeem", {
      body: { token, password: pw, fullName: name },
    });
    if (error || (data as any)?.error) {
      setBusy(false);
      toast.error((data as any)?.error ?? error?.message ?? "Could not redeem invite");
      return;
    }
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: (data as any).email, password: pw });
    setBusy(false);
    if (signInErr) { toast.error("Account ready — please sign in"); nav("/portal/auth"); return; }
    toast.success("Welcome!");
    nav("/portal");
  };

  if (valid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Invalid or expired invite</h1>
          <p className="text-sm text-muted-foreground mb-4">This link is no longer valid. Please request a new one from your counselor.</p>
          <Button onClick={()=>nav("/portal/auth")}>Go to sign in</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="p-6 w-full max-w-md space-y-3">
        <h1 className="text-2xl font-bold">Set up your portal</h1>
        <p className="text-sm text-muted-foreground">Create your password to access your application.</p>
        <div><Label>Email</Label><Input value={email} disabled/></div>
        <div><Label>Full name</Label><Input value={name} onChange={(e)=>setName(e.target.value)}/></div>
        <div><Label>Choose password</Label><Input type="password" value={pw} onChange={(e)=>setPw(e.target.value)}/></div>
        <Button className="w-full" onClick={submit} disabled={busy}>
          {busy && <Loader2 className="size-4 mr-2 animate-spin"/>}Activate account
        </Button>
      </Card>
    </div>
  );
}