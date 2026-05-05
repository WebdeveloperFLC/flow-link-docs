import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type LifecycleAction = "suspend" | "revoke" | "delete";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  action: LifecycleAction;
  userId: string;
  userName: string;
  candidates: { id: string; name: string }[];
  onDone: () => void;
}

const ACTION_LABEL: Record<LifecycleAction, string> = {
  suspend: "Suspend user",
  revoke: "Revoke access",
  delete: "Delete user",
};

export const HandleUserDataDialog = ({ open, onOpenChange, action, userId, userName, candidates, onDone }: Props) => {
  const [mode, setMode] = useState<"transfer" | "keep">("transfer");
  const [target, setTarget] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const onConfirm = async () => {
    if (mode === "transfer" && !target) { toast.error("Choose a user to receive the data"); return; }
    setBusy(true);
    const body: Record<string, unknown> = { user_id: userId };
    if (action === "delete") {
      body.action = "delete";
      if (mode === "transfer") body.transfer_to = target;
      else body.keep = true;
    } else {
      // suspend/revoke: optionally transfer first
      if (mode === "transfer") {
        const { data: t, error: te } = await supabase.functions.invoke("admin-users", {
          body: { action: "transfer_data", from_user_id: userId, to_user_id: target },
        });
        if (te || (t as { error?: string })?.error) {
          setBusy(false);
          toast.error((t as { error?: string })?.error ?? te?.message ?? "Transfer failed");
          return;
        }
      }
      body.action = action;
    }
    const { data, error } = await supabase.functions.invoke("admin-users", { body });
    setBusy(false);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error ?? error?.message ?? "Action failed");
      return;
    }
    toast.success("Done");
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{ACTION_LABEL[action]}: {userName}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            What should happen to this user's data (clients, documents, activities)?
          </p>
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as "transfer" | "keep")} className="space-y-2">
            <div className="flex items-start gap-2 p-3 border rounded-md">
              <RadioGroupItem value="transfer" id="m-transfer" className="mt-1" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="m-transfer" className="font-medium">Transfer to another user</Label>
                <p className="text-xs text-muted-foreground">Reassign ownership of all clients, documents and activities.</p>
                <Select value={target} onValueChange={setTarget} disabled={mode !== "transfer"}>
                  <SelectTrigger><SelectValue placeholder="Select recipient" /></SelectTrigger>
                  <SelectContent>
                    {candidates.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 border rounded-md">
              <RadioGroupItem value="keep" id="m-keep" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="m-keep" className="font-medium">Keep with same user</Label>
                <p className="text-xs text-muted-foreground">Mark as inactive owner. No data is moved or deleted.</p>
              </div>
            </div>
          </RadioGroup>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onConfirm} disabled={busy} variant={action === "delete" ? "destructive" : "default"}>
            {busy ? "Working…" : `Confirm ${action}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};