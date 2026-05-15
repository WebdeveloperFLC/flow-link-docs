import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link2, Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCRMClients, type CRMClient } from "../../lib/crmBridge";
import { MOCK_CLIENTS } from "../../data/mockClients";
import type { Client } from "../../types/clients";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onLinked?: (c: Client) => void;
}

export default function LinkCrmClientDialog({ open, onOpenChange, onLinked }: Props) {
  const [crmClients, setCrmClients] = useState<CRMClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getCRMClients()
      .then(setCrmClients)
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const linkedIds = new Set(MOCK_CLIENTS.map(c => c.linkedCrmClientId).filter(Boolean));
    return crmClients
      .filter(c => !linkedIds.has(c.id))
      .filter(c => !ql ||
        c.name?.toLowerCase().includes(ql) ||
        c.email?.toLowerCase().includes(ql) ||
        c.phone?.toLowerCase().includes(ql));
  }, [crmClients, q]);

  const handleLink = () => {
    const crm = crmClients.find(c => c.id === selectedId);
    if (!crm) { toast.error("Pick a CRM client"); return; }
    const newClient: Client = {
      id: `c-crm-${crm.id.slice(0, 8)}`,
      name: crm.name,
      legalName: crm.name,
      segment: "INDIVIDUAL",
      clientType: "STUDENT",
      country: crm.country ?? "CA",
      taxId: "—",
      paymentTerms: "Due on receipt",
      currency: crm.country === "IN" ? "INR" : crm.country === "US" ? "USD" : "CAD",
      status: "ACTIVE",
      outstandingReceivable: 0,
      ytdRevenue: 0,
      lastTxnDate: new Date().toISOString().slice(0, 10),
      email: crm.email ?? "",
      phone: crm.phone ?? "",
      address: "",
      accountManager: "",
      linkedCrmClientId: crm.id,
    };
    MOCK_CLIENTS.push(newClient);
    onLinked?.(newClient);
    toast.success(`Linked ${crm.name} from CRM`);
    onOpenChange(false);
    setSelectedId(null); setQ("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Link existing CRM client</DialogTitle>
          <DialogDescription>
            Search clients in the CRM and link one to create a connected accounting ledger profile.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email or phone…"
            className="pl-9" autoFocus />
        </div>

        <ScrollArea className="h-[320px] border rounded-md">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading CRM clients…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              {crmClients.length === 0 ? "No CRM clients found." : "No matches — adjust your search."}
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map(c => {
                const active = selectedId === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-muted/60 ${active ? "bg-muted" : ""}`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{c.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {c.email ?? "—"} · {c.phone ?? "—"} {c.country ? `· ${c.country}` : ""}
                        </div>
                      </div>
                      {active && <Link2 className="size-4 text-primary shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleLink} disabled={!selectedId}>
            <Link2 className="size-4" /> Link client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}