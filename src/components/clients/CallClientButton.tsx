import { Button } from "@/components/ui/button";
import { Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { useCall } from "@/contexts/CallContext";
import { TelephonyCallError } from "@/lib/telephony/client";

interface Props {
  clientId: string;
}

export function CallClientButton({ clientId }: Props) {
  const { currentCall, startingClientId, isActive, startCall } = useCall();
  const activeForThis = isActive(clientId);
  const isThisCall = currentCall?.clientId === clientId;
  const startingForThis = startingClientId === clientId;

  const label = (() => {
    if (startingForThis) return "Connecting…";
    if (!isThisCall) return "Call";
    switch (currentCall?.status) {
      case "initiated": return "Dialing…";
      case "ringing": return "Ringing…";
      case "answered": return "On call";
      case "failed": return "Failed";
      case "no_answer": return "No answer";
      case "busy": return "Busy";
      case "completed": return "Ended";
      case "canceled": return "Canceled";
      default: return "Call";
    }
  })();

  const onClick = async () => {
    if (activeForThis || startingForThis) return;
    try {
      const r = await startCall(clientId);
      if (r) toast.success("Call request accepted", { description: "Waiting for connection updates." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const trace = e instanceof TelephonyCallError && e.traceId ? `Trace: ${e.traceId}` : undefined;
      toast.error("Could not start call", { description: [msg, trace].filter(Boolean).join("\n") });
    }
  };

  return (
    <Button onClick={onClick} disabled={activeForThis || startingForThis} variant="outline" size="sm">
      {activeForThis || startingForThis ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Phone className="size-4 mr-1.5" />}
      {label}
    </Button>
  );
}