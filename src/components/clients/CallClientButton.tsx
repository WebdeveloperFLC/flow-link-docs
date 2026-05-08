import { Button } from "@/components/ui/button";
import { Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { useCall } from "@/contexts/CallContext";

interface Props {
  clientId: string;
}

export function CallClientButton({ clientId }: Props) {
  const { currentCall, isActive, startCall } = useCall();
  const activeForThis = isActive(clientId);
  const isThisCall = currentCall?.clientId === clientId;

  const label = (() => {
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
    if (activeForThis) return;
    try {
      const r = await startCall(clientId);
      if (r) {
        toast.success("Calling client…", {
          description: r.maskedNumber ? `Connecting from ${r.maskedNumber}` : undefined,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Could not start call", { description: msg });
    }
  };

  return (
    <Button onClick={onClick} disabled={activeForThis} variant="outline" size="sm">
      {activeForThis ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Phone className="size-4 mr-1.5" />}
      {label}
    </Button>
  );
}