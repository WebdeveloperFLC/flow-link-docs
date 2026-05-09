import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable";

export default function PortalAuth() {
  const { user, roles, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && (roles.includes("client") || roles.includes("admin"))) nav("/portal", { replace: true });
  }, [user, roles, loading, nav]);

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message); else nav("/portal");
  };
  const signUp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/portal`,
        data: { full_name: name, signup_role: "client" },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Account created. Please check your email if confirmation is required.");
  };
  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/portal` });
    if (result.error) toast.error(result.error.message ?? "Google sign-in failed");
  };
  const reset = async () => {
    if (!email) { toast.error("Enter your email first"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast.error(error.message); else toast.success("Reset link sent");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold mb-1">Client Portal</h1>
        <p className="text-sm text-muted-foreground mb-4">Sign in to track your application</p>
        <Tabs defaultValue="signin">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="space-y-3 pt-4">
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} /></div>
            <div><Label>Password</Label><Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} /></div>
            <Button className="w-full" onClick={signIn} disabled={busy}>{busy && <Loader2 className="size-4 mr-2 animate-spin"/>}Sign in</Button>
            <button className="text-xs text-muted-foreground underline" onClick={reset}>Forgot password?</button>
          </TabsContent>
          <TabsContent value="signup" className="space-y-3 pt-4">
            <div><Label>Full name</Label><Input value={name} onChange={(e)=>setName(e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} /></div>
            <div><Label>Password</Label><Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} /></div>
            <Button className="w-full" onClick={signUp} disabled={busy}>{busy && <Loader2 className="size-4 mr-2 animate-spin"/>}Create account</Button>
            <p className="text-[11px] text-muted-foreground">After signup, ask your counselor to link your account to your case.</p>
          </TabsContent>
        </Tabs>
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
        </div>
      </Card>
    </div>
  );
}