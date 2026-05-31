import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, XCircle, CalendarClock } from "lucide-react";

type Action = "confirm" | "decline" | "reschedule";

export default function VisitorActionPage() {
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const [action, setAction] = useState<Action>((params.get("action") as Action) || "confirm");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; status?: string; error?: string } | null>(null);

  useEffect(() => { setAction((params.get("action") as Action) || "confirm"); }, [params]);

  const submit = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("calendar-visitor-action", {
      body: { token, action, reason: reason || undefined },
    });
    setSubmitting(false);
    if (error) setResult({ ok: false, error: error.message });
    else if ((data as any)?.error) setResult({ ok: false, error: (data as any).error });
    else setResult({ ok: true, status: (data as any)?.status });
  };

  const heading = action === "confirm" ? "Confirm your attendance"
    : action === "decline" ? "Decline the meeting" : "Request a reschedule";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {action === "confirm" && <CheckCircle2 className="size-5 text-emerald-600" />}
            {action === "decline" && <XCircle className="size-5 text-red-600" />}
            {action === "reschedule" && <CalendarClock className="size-5 text-blue-600" />}
            {result?.ok ? "Done" : heading}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result?.ok ? (
            <p className="text-sm">
              {result.status === "confirmed" && "Thanks — your attendance is confirmed. The host has been notified."}
              {result.status === "declined_by_requester" && "You've declined the meeting. The host has been notified."}
              {result.status === "reschedule_requested" && "Your reschedule request has been sent. The host will propose a new time."}
            </p>
          ) : result?.error ? (
            <p className="text-sm text-red-600">{result.error}</p>
          ) : (
            <>
              {action !== "confirm" && (
                <Textarea
                  placeholder={action === "decline" ? "Optional reason for the host" : "Preferred timing (optional)"}
                  value={reason} onChange={(e) => setReason(e.target.value)} rows={4}
                />
              )}
              <Button onClick={submit} disabled={submitting} className="w-full">
                {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                {action === "confirm" ? "Confirm attendance" : action === "decline" ? "Decline meeting" : "Send reschedule request"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}