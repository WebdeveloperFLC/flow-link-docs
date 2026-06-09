import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { shortlistCourseForClient } from "@/lib/clientPrograms";

type ClientRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  application_id: string | null;
};

export function AttachCourseToClientDialog({
  open,
  onOpenChange,
  courseId,
  courseLabel,
  defaultClientId,
  onAttached,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseLabel: string;
  defaultClientId?: string | null;
  onAttached?: (clientId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<string | null>(defaultClientId ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPicked(defaultClientId ?? null);
    setQ("");
    setLoading(true);
    supabase
      .from("clients")
      .select("id, full_name, email, phone, country, application_id")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setClients((data ?? []) as ClientRow[]);
        setLoading(false);
      });
  }, [open, defaultClientId]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return clients;
    return clients.filter((c) =>
      `${c.full_name} ${c.email ?? ""} ${c.phone ?? ""} ${c.application_id ?? ""} ${c.country ?? ""}`
        .toLowerCase()
        .includes(t),
    );
  }, [clients, q]);

  const attach = async () => {
    if (!picked) {
      toast.error("Select a client");
      return;
    }
    setBusy(true);
    try {
      await shortlistCourseForClient(picked, courseId);
      toast.success("Added to client shortlist");
      onAttached?.(picked);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add program");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Shortlist for client</DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">
            Add <span className="font-medium text-foreground">{courseLabel}</span> to the client&apos;s working
            shortlist. Mark as final from the client file when ready.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="size-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, file no., email, phone…"
              className="pl-9"
            />
          </div>

          <div className="border rounded-md max-h-64 overflow-auto">
            {loading ? (
              <div className="p-8 grid place-items-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No clients match.</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPicked(c.id)}
                  className={`w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-muted/50 ${
                    picked === c.id ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="font-medium text-sm">{c.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {[c.application_id, c.email, c.phone, c.country].filter(Boolean).join(" · ") || "—"}
                  </div>
                </button>
              ))
            )}
          </div>

          <Button variant="outline" size="sm" className="w-full gap-2" asChild>
            <Link to="/leads/new?register_client=1">
              <UserPlus className="size-4" />
              Register new client
            </Link>
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={attach} disabled={busy || !picked}>
            {busy ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
            Add to shortlist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
