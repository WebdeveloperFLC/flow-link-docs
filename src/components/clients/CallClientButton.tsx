import { Button } from "@/components/ui/button";
import { Loader2, Phone, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { useCall } from "@/contexts/CallContext";
import { useBrowserPhone } from "@/contexts/BrowserPhoneContext";
import { TelephonyCallError } from "@/lib/telephony/client";

interface Props {
  clientId: string;
}

export function CallClientButton({ clientId }: Props) {
  const { currentCall, startingClientId, isActive, startCall, hangup } = useCall();
  const browserPhone = useBrowserPhone();
  const activeForThis = isActive(clientId);
  const isThisCall = currentCall?.clientId === clientId;
  const startingForThis = startingClientId === clientId;
  const browserReady = browserPhone.status === "ready";
  const callDisabled = !browserReady || activeForThis || startingForThis;

  const label = (() => {
    if (startingForThis) return "Connecting…";
    if (!browserReady) return "Connect phone first";
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
    if (!browserReady) {
      toast.error("Connect browser phone first", { description: "Open Telephony Settings and wait until Browser Calling shows Ready." });
      return;
    }
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
    <div className="inline-flex items-center gap-2">
      <Button onClick={onClick} disabled={callDisabled} variant="outline" size="sm">
        {activeForThis || startingForThis ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Phone className="size-4 mr-1.5" />}
        {label}
      </Button>
      {(activeForThis || (isThisCall && startingForThis)) && (
        <Button onClick={() => hangup()} variant="destructive" size="sm">
          <PhoneOff className="size-4 mr-1.5" />
          Hang up
        </Button>
      )}
    </div>
  );
}