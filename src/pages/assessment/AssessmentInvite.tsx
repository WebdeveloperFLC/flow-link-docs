import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";

export default function AssessmentInvite() {
  const { token } = useParams<{ token: string }>();
  const [first, setFirst] = useState("");
  const [middle, setMiddle] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Immigration");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setInvalid(true);
      return;
    }
    supabase
      .from("assessment_invitations")
      .select("first_name, middle_name, last_name, email, status, expires_at")
      .eq("token", token)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setInvalid(true);
          setLoading(false);
          return;
        }
        if (data.status !== "pending" || new Date(data.expires_at) < new Date()) {
          setInvalid(true);
          setLoading(false);
          return;
        }
        if (data.first_name) setFirst(data.first_name);
        if (data.middle_name) setMiddle(data.middle_name);
        if (data.last_name) setLast(data.last_name);
        if (data.email) setEmail(data.email);

        supabase
          .from("assessment_sessions")
          .select("country")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data: ses }) => {
            if (ses?.country) setCountry(ses.country);
            setLoading(false);
          });
      });
  }, [token]);

  const submit = async () => {
    if (!first || !last || !email || !phone) return toast.error("Please fill required fields");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("assessment-register", {
      body: { inviteToken: token, firstName: first, middleName: middle, lastName: last, email, phone },
    });
    setBusy(false);
    if (error || (data as any)?.error) return toast.error(error?.message ?? (data as any)?.error ?? "Failed");
    setDone(true);
    toast.success("Check your email — verification link sent");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-3">
          <div className="text-lg font-semibold">Invitation not found</div>
          <div className="text-sm text-muted-foreground">
            This link may be expired or already used. Please contact your consultant for a new invitation.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <MapPin className="size-3.5" /> {country} Immigration Assessment
          </div>
          <h1 className="text-2xl font-bold">You've been invited</h1>
          <p className="text-sm text-muted-foreground">Confirm your details to begin your free assessment.</p>
        </div>
        <Card className="p-6 space-y-3">
          {done ? (
            <div className="text-center py-6 space-y-2">
              <div className="text-lg font-semibold">Verification email sent</div>
              <div className="text-sm text-muted-foreground">
                Open the link in your inbox to start the questionnaire.
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label>First *</Label>
                  <Input value={first} onChange={(e) => setFirst(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Middle</Label>
                  <Input value={middle} onChange={(e) => setMiddle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Last *</Label>
                  <Input value={last} onChange={(e) => setLast(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <p className="text-xs text-muted-foreground">Must match the email on your invitation.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <Button onClick={submit} disabled={busy} className="w-full">
                {busy ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
                Send me the verification link
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
