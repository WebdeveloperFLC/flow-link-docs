import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { startCall } from "@/lib/telephony/client";

interface Props {
  clientId: string;
}

export function CallClientButton({ clientId }: Props) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      const result = await startCall({ clientId });
      if (result.status === "ringing" || result.status === "initiated") {
        toast.success("Calling client…", {
          description: result.maskedNumber ? `Connecting from ${result.maskedNumber}` : undefined,
        });
      } else {
        toast.error("Call failed to start");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Could not start call", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={onClick} disabled={loading} variant="outline" size="sm">
      {loading ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Phone className="size-4 mr-1.5" />}
      Call
    </Button>
  );
}