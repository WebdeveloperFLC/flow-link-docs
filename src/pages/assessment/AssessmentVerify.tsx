import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function AssessmentVerify() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading"|"ok"|"err">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("assessment-verify-email", { body: { token } });
      if (error || (data as any)?.error) { setStatus("err"); setMsg(error?.message ?? (data as any)?.error ?? "Verification failed"); return; }
      const link = (data as any)?.actionLink;
      if (link) { window.location.href = link; return; }
      setStatus("ok");
    })();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center space-y-3">
        {status === "loading" && <><Loader2 className="size-8 mx-auto animate-spin text-primary" /><div>Verifying your email…</div></>}
        {status === "ok" && <><CheckCircle2 className="size-10 mx-auto text-success" /><div className="font-semibold">Email verified</div><div className="text-sm text-muted-foreground">Redirecting…</div></>}
        {status === "err" && <><XCircle className="size-10 mx-auto text-destructive" /><div className="font-semibold">Could not verify</div><div className="text-sm text-muted-foreground">{msg}</div></>}
      </Card>
    </div>
  );
}
