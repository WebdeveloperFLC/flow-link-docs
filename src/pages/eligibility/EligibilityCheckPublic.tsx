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
      const { data, error } = await supabase.functions.invoke("service-eligibility-session", {
        body: {
          action: "public_create",
          libraryId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
        },
      });
      if (error) throw error;
      const sessionId = data?.sessionId;
      if (!sessionId) throw new Error("Could not start assessment");
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
          <div>
            <Label>Phone (optional)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <Button className="w-full" onClick={start} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Start eligibility assessment"}
        </Button>
      </Card>
    </div>
  );
}
