import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";

export default function AssessmentLanding() {
  const nav = useNavigate();
  const [referralCode, setReferralCode] = useState("");
  const [firstName, setFirst] = useState("");
  const [middleName, setMiddle] = useState("");
  const [lastName, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const register = async () => {
    if (!firstName || !lastName || !email || !phone || !referralCode) {
      toast.error("Please fill all required fields and your referral code");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("assessment-register", {
      body: { firstName, middleName, lastName, email, phone, referralCode },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast.error(error?.message ?? (data as any)?.error ?? "Could not register");
      return;
    }
    toast.success("Check your email — we sent you a verification link.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <MapPin className="size-3.5" /> Canada Immigration
          </div>
          <h1 className="text-3xl font-bold">Free Eligibility Assessment</h1>
          <p className="text-muted-foreground">Discover your pathways to Canadian Permanent Residence. Takes about 8 minutes.</p>
        </div>

        <Card className="p-6 space-y-4">
          <Tabs defaultValue="register">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="register">New — register</TabsTrigger>
              <TabsTrigger value="invite">I have an invitation</TabsTrigger>
            </TabsList>

            <TabsContent value="register" className="space-y-3 pt-4">
              <p className="text-sm text-muted-foreground">
                Enter your referral code (provided by your counselor or referrer) and your details. We'll email you a link to begin.
              </p>
              <div className="space-y-1.5">
                <Label>Referral code *</Label>
                <Input value={referralCode} onChange={(e) => setReferralCode(e.target.value)} placeholder="e.g. FLC2026" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5"><Label>First name *</Label><Input value={firstName} onChange={(e) => setFirst(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Middle name</Label><Input value={middleName} onChange={(e) => setMiddle(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Last name *</Label><Input value={lastName} onChange={(e) => setLast(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Phone *</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0123" /></div>
              </div>
              <Button onClick={register} disabled={busy} className="w-full">
                {busy ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
                Register & email me the link
              </Button>
            </TabsContent>

            <TabsContent value="invite" className="space-y-3 pt-4">
              <p className="text-sm">
                If you've received an invitation email from Futurelink Consultants, please open the link from that email to begin.
              </p>
              <p className="text-sm text-muted-foreground">No invitation? Switch to the "New — register" tab and use a referral code.</p>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-xs text-center text-muted-foreground">By proceeding you consent to be contacted about your assessment. We do not share your data.</p>
      </div>
    </div>
  );
}
