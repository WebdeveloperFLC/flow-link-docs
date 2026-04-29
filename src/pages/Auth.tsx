import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, Lock, Sparkles } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email").max(255),
  password: z.string().min(8, "Min 8 characters").max(72),
  fullName: z.string().trim().min(2).max(100).optional(),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

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

  const onSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      email: fd.get("email"), password: fd.get("password"), fullName: fd.get("fullName"),
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: parsed.data.fullName },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Account created — you can sign in now");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="hidden lg:flex relative overflow-hidden gradient-accent text-white p-12 flex-col justify-between">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <FileText className="size-6" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight">Future Link</div>
              <div className="text-xs uppercase tracking-[0.2em] opacity-80">Document Management</div>
            </div>
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
          <p className="text-sm text-muted-foreground mt-1 mb-6">First user to register becomes the administrator.</p>

          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={onSignIn} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="si-pw">Password</Label>
                  <Input id="si-pw" name="password" type="password" required autoComplete="current-password" />
                </div>
                <Button type="submit" disabled={busy} className="w-full gradient-brand text-primary-foreground">
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={onSignUp} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" name="fullName" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-pw">Password</Label>
                  <Input id="su-pw" name="password" type="password" required minLength={8} autoComplete="new-password" />
                  <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
                </div>
                <Button type="submit" disabled={busy} className="w-full gradient-brand text-primary-foreground">
                  {busy ? "Creating…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;