import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBranches } from "../hooks/useDshMedia";
import type { DshMedia } from "../lib/dshTypes";

export function NotifyBranchesDialog({
  media,
  open,
  onOpenChange,
}: {
  media: DshMedia | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: branches = [] } = useBranches();
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!media) throw new Error("No content selected");
      if (selected.length === 0) throw new Error("Select at least one branch");
      const { data, error } = await supabase.functions.invoke("dsh-notify-branches", {
        body: { media_id: media.id, branch_ids: selected, message },
      });
      if (error) throw error;
      return data as { sent: number; failed: number; recipients: number };
    },
    onSuccess: (d) => {
      toast.success(`Notified ${d.sent}/${d.recipients} recipients${d.failed ? ` (${d.failed} failed)` : ""}`);
      onOpenChange(false);
      setSelected([]); setMessage("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to notify"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Notify branches</DialogTitle>
        </DialogHeader>
        {media && (
          <div className="text-sm text-muted-foreground">
            <strong className="text-foreground">{media.title}</strong>
            {media.campaign_name ? ` · ${media.campaign_name}` : ""}
          </div>
        )}
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Branches</Label>
            <div className="max-h-60 overflow-y-auto border rounded-md p-2 grid gap-1">
              {branches.length === 0 && (
                <p className="text-xs text-muted-foreground p-2">No branches found.</p>
              )}
              {branches.map((b: any) => (
                <label key={b.id} className="flex items-center gap-2 text-sm py-1 px-1 hover:bg-muted/40 rounded">
                  <Checkbox
                    checked={selected.includes(b.id)}
                    onCheckedChange={() => toggle(b.id)}
                  />
                  {b.name}
                </label>
              ))}
            </div>
            <div className="flex justify-between text-xs">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setSelected(branches.map((b: any) => b.id))}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:underline"
                onClick={() => setSelected([])}
              >
                Clear
              </button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Message (optional)</Label>
            <Textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Anything the front desk should know…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Sending…" : "Send notification"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}