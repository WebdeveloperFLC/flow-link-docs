import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchEligibilityQuestions } from "@/lib/service-eligibility/questions";
import { createPublicEligibilitySession } from "@/lib/service-eligibility/sessions";
import { dialCodeFor } from "@/lib/countryCodes";
import { PhoneCodeSelect } from "@/components/leads/PhoneCodeSelect";
import { VISA_IMMIGRATION } from "@/lib/service-eligibility/types";

export default function EligibilityCheckPublic() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const libraryId = params.get("library_id");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+1");

  useEffect(() => {
    if (!libraryId) {
      setLoading(false);
      return;
    }
    Promise.all([
      supabase
        .from("service_library")
        .select("sub_service, service, service_category")
        .eq("id", libraryId)
        .maybeSingle(),
      fetchEligibilityQuestions(libraryId).catch(() => []),
    ]).then(([libRes, qs]) => {
      const lib = libRes.data;
      if (!lib || lib.service_category !== VISA_IMMIGRATION) {
        toast.error("Eligibility check is not available for this service");
        setLoading(false);
        return;
      }
      if (!qs.length) {
        toast.error("No eligibility questions configured yet");
      }
      setTitle(`${lib.service} – ${lib.sub_service}`);
      const cc = dialCodeFor(lib.service);
      if (cc) setPhoneCountryCode(`+${cc}`);
      setLoading(false);
    });
  }, [libraryId]);

  const start = async () => {
    if (!libraryId || !name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setBusy(true);
    try {
      const { sessionId } = await createPublicEligibilitySession({
        libraryId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        phone_country_code: phoneCountryCode,
      });
      navigate(`/eligibility/run/${sessionId}?public=1`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not start");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Future Link Consultants</p>
          <h1 className="text-xl font-bold mt-1">Check your eligibility</h1>
          {title && <p className="text-sm text-muted-foreground mt-1">{title}</p>}
        </div>
        <p className="text-sm text-muted-foreground">
          Short assessment — no documents needed now. Tell us what you have and what you are preparing.
        </p>
        <div className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-[140px_1fr] gap-2">
            <div>
              <Label>Country code</Label>
              <PhoneCodeSelect value={phoneCountryCode} onChange={setPhoneCountryCode} />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ""))}
              />
            </div>
          </div>
        </div>
        <Button className="w-full" onClick={start} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Start eligibility assessment"}
        </Button>
      </Card>
    </div>
  );
}
