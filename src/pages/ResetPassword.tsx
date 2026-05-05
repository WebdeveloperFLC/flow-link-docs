import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";

const pwSchema = z.string()
  .min(8, "Min 8 characters")
  .regex(/[A-Z]/, "Must include an uppercase letter")
  .regex(/[a-z]/, "Must include a lowercase letter")
  .regex(/[0-9]/, "Must include a digit")
  .regex(/[^A-Za-z0-9]/, "Must include a symbol");

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  useEffect(() => {
    // Supabase places recovery tokens in URL hash; getSession() will pick it up.
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = pwSchema.safeParse(pw);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    if (pw !== pw2) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setBusy(false); toast.error(error.message); return; }
    try { await supabase.auth.signOut({ scope: "others" }); } catch { /* noop */ }
    setBusy(false);
    toast.success("Password updated — please sign in");
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm p-6 space-y-4">
        <h1 className="text-xl font-bold">Set a new password</h1>
        {!ready ? (
          <p className="text-sm text-muted-foreground">
            Open the reset link from your email to continue. If the link has expired, request a new one from the sign-in page.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rp-pw">New password</Label>
              <Input id="rp-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required />
              <p className="text-xs text-muted-foreground">8+ chars, upper + lower + digit + symbol.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-pw2">Confirm password</Label>
              <Input id="rp-pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
            </div>
            <Button type="submit" disabled={busy} className="w-full">{busy ? "Updating…" : "Update password"}</Button>
          </form>
        )}
      </Card>
    </div>
  );
};

export default ResetPassword;