import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { appendClientActivityLog } from "@/lib/clientActivityLog";
import { useMasterItems } from "@/lib/masters";
import { resolveClientStatusLabel } from "@/lib/clientStatus";
import { ClientStatusConfirmDialog } from "@/components/clients/ClientStatusConfirmDialog";

type Props = {
  clientId: string;
  caseClosed?: boolean;
  /** Inline row for visa application header (default). */
  compact?: boolean;
};

/** Client status from Masters — shown in visa header, not under the journey bar. */
export function ClientStatusBar({ clientId, caseClosed, compact = true }: Props) {
  const { canUpload } = useAuth();
  const statusOptions = useMasterItems("client_statuses");
  const [clientStatus, setClientStatus] = useState("in_progress");
  const [savedStatus, setSavedStatus] = useState("in_progress");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase
      .from("clients")
      .select("status")
      .eq("id", clientId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const st = (data as { status?: string | null })?.status?.trim() || "in_progress";
        setClientStatus(st);
        setSavedStatus(st);
      });
    return () => {
      alive = false;
    };
  }, [clientId]);

  const defaultStatusCode = statusOptions[0]?.code ?? "in_progress";

  if (!canUpload || caseClosed) return null;

  const persistStatus = async (next: string, reason?: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("clients").update({ status: next }).eq("id", clientId);
      if (error) throw error;
      await appendClientActivityLog({
        clientId,
        action: "client_status_changed",
        summary: "Client status updated",
        previousValue: resolveClientStatusLabel(savedStatus, statusOptions),
        newValue: resolveClientStatusLabel(next, statusOptions),
        metadata: { status: next, reason: reason ?? null },
      });
      setSavedStatus(next);
      setClientStatus(next);
      toast.success("Client status saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save client status");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  const onSaveStatus = () => {
    const next = clientStatus || defaultStatusCode;
    if (!next) {
      toast.error("Select a client status");
      return;
    }
    if (next === savedStatus) {
      toast.message("Status unchanged");
      return;
    }
    setConfirmOpen(true);
  };

  const statusControl = (
    <>
      <Select value={clientStatus || defaultStatusCode} onValueChange={setClientStatus} disabled={busy}>
        <SelectTrigger aria-label="Change client status" className={compact ? "w-[160px] sm:w-[200px] h-8 text-xs" : "w-[220px] h-8 text-xs"}>
          <SelectValue placeholder="Select a status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.length === 0 ? (
            <SelectItem value="in_progress" disabled>
              No statuses — add in Masters
            </SelectItem>
          ) : (
            statusOptions.map((opt) => (
              <SelectItem key={opt.code} value={opt.code}>
                {opt.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <Button size="sm" variant="secondary" className="h-8" onClick={onSaveStatus} disabled={busy}>
        Save
      </Button>
      <ClientStatusConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        currentLabel={resolveClientStatusLabel(savedStatus, statusOptions)}
        nextLabel={resolveClientStatusLabel(clientStatus || defaultStatusCode, statusOptions)}
        nextCode={clientStatus || defaultStatusCode}
        busy={busy}
        onConfirm={(reason) => void persistStatus(clientStatus || defaultStatusCode, reason)}
      />
    </>
  );

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hidden sm:inline">
          Client status
        </span>
        {statusControl}
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client status</div>
      <div className="flex flex-wrap gap-2">{statusControl}</div>
    </div>
  );
}
