import { useEffect, useState } from "react";
import { useCall } from "@/contexts/CallContext";
import { AddRemarkDialog } from "@/components/clients/AddRemarkDialog";

/**
 * Globally listens to the call context and, when a call enters a terminal
 * state, opens the remark dialog so the caller can log notes / disposition
 * against the call session. Available for every role that can place a call.
 */
export function PostCallNotesDialog() {
  const { lastCompletedCall, clearLastCompletedCall } = useCall();
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<{ sessionId: string; clientId: string } | null>(null);

  useEffect(() => {
    if (lastCompletedCall) {
      setSnapshot({ sessionId: lastCompletedCall.sessionId, clientId: lastCompletedCall.clientId });
      setOpen(true);
      clearLastCompletedCall();
    }
  }, [lastCompletedCall, clearLastCompletedCall]);

  if (!snapshot) return null;
  return (
    <AddRemarkDialog
      open={open}
      onOpenChange={(o) => { setOpen(o); if (!o) setSnapshot(null); }}
      clientId={snapshot.clientId}
      callSessionId={snapshot.sessionId}
    />
  );
}