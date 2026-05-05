import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Lock, Sparkles } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email").max(255),
  password: z.string().min(8, "Min 8 characters").max(72),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const onSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Welcome back");
  };

  const onForgot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = z.string().email().safeParse(forgotEmail);
    if (!parsed.success) { toast.error("Enter a valid email"); return; }
    setForgotBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Reset link sent — check your email"); setForgotOpen(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="hidden lg:flex relative overflow-hidden gradient-accent text-white p-12 flex-col justify-between">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative">
          <div className="bg-white rounded-2xl p-4 inline-block shadow-elev-md">
            <img
              src="/flc-logo.png"
              alt="Future Link Consultants"
              className="h-16 w-auto object-contain"
            />
          </div>
        </div>

        <div className="relative space-y-6 max-w-md">
          <h2 className="text-4xl font-bold tracking-tight leading-tight">
            Submission-ready binders, in minutes.
          </h2>
          <p className="text-white/85 text-lg">
            Upload, auto-process, and assemble immigration document binders with confidence.
          </p>
          <div className="space-y-3 pt-2">
            {[
              { icon: Sparkles, t: "Auto-rename, convert, and compress to IRCC standards" },
              { icon: Lock, t: "Role-based access and full audit trail" },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-white/90">
                <f.icon className="size-5 mt-0.5 shrink-0" />
                <span>{f.t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-white/60">© Future Link · For internal use only</div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="size-9 rounded-lg gradient-accent flex items-center justify-center">
              <FileText className="size-5 text-white" />
            </div>
            <div className="font-bold">Future Link DMS</div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight">Sign in to your workspace</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Enter your credentials to continue.</p>

          <form onSubmit={onSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="si-email">Email</Label>
              <Input id="si-email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="si-pw">Password</Label>
                <button type="button" onClick={() => setForgotOpen(true)} className="text-xs text-primary hover:underline">Forgot password?</button>
              </div>
              <Input id="si-pw" name="password" type="password" required autoComplete="current-password" />
            </div>
            <Button type="submit" disabled={busy} className="w-full gradient-brand text-primary-foreground">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-6 text-center">
            Need an account? Ask your administrator to invite you.
          </p>

          <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader><DialogTitle>Reset password</DialogTitle></DialogHeader>
              <form onSubmit={onForgot} className="space-y-4">
                <p className="text-sm text-muted-foreground">We'll email you a secure reset link. The link expires in 15 minutes.</p>
                <div className="space-y-1.5">
                  <Label htmlFor="fp-email">Email</Label>
                  <Input id="fp-email" type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={forgotBusy}>{forgotBusy ? "Sending…" : "Send reset link"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default Auth;