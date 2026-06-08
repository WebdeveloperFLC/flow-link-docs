import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServiceTabs, type ServiceSelection } from "@/components/leads/ServiceTabs";
import { fetchAllServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";
import { appendTimeline } from "@/lib/timeline";
import { toast } from "sonner";
import { Loader2, Pencil, Sparkles } from "lucide-react";

const EMPTY: ServiceSelection = {
  coaching_services: [],
  visa_services: [],
  admission_services: [],
  allied_services: [],
  travel_services: [],
};

type DisplayGroup = {
  label: string;
  keys: (keyof ServiceSelection)[];
};

const DISPLAY_GROUPS: DisplayGroup[] = [
  { label: "Coaching", keys: ["coaching_services"] },
  { label: "Visa & Immigration", keys: ["visa_services"] },
  { label: "Admission", keys: ["admission_services"] },
  { label: "Allied & Travel", keys: ["allied_services", "travel_services"] },
];

async function autoDraftInvoiceForServices(
  clientId: string,
  selection: ServiceSelection,
  catalogue: ServiceCatalogueItem[],
): Promise<number> {
  const selectedCodes = new Set<string>([
    ...selection.coaching_services,
    ...selection.visa_services,
    ...selection.admission_services,
    ...selection.allied_services,
    ...selection.travel_services,
  ]);

  const candidates = catalogue.filter((s) => {
    const code = s.service_code || s.id;
    if (!selectedCodes.has(code)) return false;
    const fee = Number(s.fee_inr ?? 0);
    return fee > 0 && s.pricing_type !== "FREE" && s.pricing_type !== "ON_REQUEST";
  });
  if (candidates.length === 0) return 0;

  const { data: existing } = await supabase
    .from("client_invoices")
    .select("line_items,status")
    .eq("client_id", clientId);

  const invoicedIds = new Set<string>();
  for (const inv of existing ?? []) {
    if ((inv as { status?: string }).status === "cancelled") continue;
    const items = (inv as { line_items?: unknown }).line_items;
    if (Array.isArray(items)) {
      for (const li of items) {
        const sid = (li as { service_id?: string })?.service_id;
        if (sid) invoicedIds.add(sid);
      }
    }
  }

  const toInvoice = candidates.filter((s) => !invoicedIds.has(s.id));
  if (toInvoice.length === 0) return 0;

  const currency = "INR";
  const lineItems = toInvoice.map((s) => {
    const unit = Number(s.fee_inr ?? 0);
    return {
      service_id: s.id,
      service_name: s.service_name,
      description: s.service_name,
      quantity: 1,
      currency,
      amount: unit,
      discount: 0,
      tax: 0,
      total: unit,
    };
  });
  const total = lineItems.reduce((n, li) => n + li.total, 0);

  const { data: u } = await supabase.auth.getUser();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("client_invoices").insert({
    client_id: clientId,
    invoice_number: `TEMP-${crypto.randomUUID()}`,
    amount: total,
    currency,
    status: "draft",
    line_items: lineItems,
    due_date: null,
    branch_id: null,
    firm_entity_id: null,
    created_by: u?.user?.id ?? null,
    invoice_entity_code: "FLC",
    invoice_branch_code: "GEN",
    fx_snapshot_date: today,
    fx_rate_to_inr: 1,
    fx_rate_to_cad: 1,
    fx_rate_to_usd: 1,
    fx_provider: "manual",
    fx_manual_override: true,
    subtotal_in_inr: total,
    subtotal_in_cad: total,
    subtotal_in_usd: total,
  } as never);
  if (error) throw error;
  return toInvoice.length;
}

export function ClientServicesCard({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const [selection, setSelection] = useState<ServiceSelection>(EMPTY);
  const [catalogue, setCatalogue] = useState<ServiceCatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ServiceSelection>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, cat] = await Promise.all([
      supabase
        .from("clients")
        .select("coaching_services,visa_services,admission_services,allied_services,travel_financial_services")
        .eq("id", clientId)
        .maybeSingle(),
      fetchAllServiceCatalogue().catch(() => [] as ServiceCatalogueItem[]),
    ]);
    setCatalogue(cat);
    setSelection({
      coaching_services: (c?.coaching_services as string[] | null) ?? [],
      visa_services: (c?.visa_services as string[] | null) ?? [],
      admission_services: (c?.admission_services as string[] | null) ?? [],
      allied_services: (c?.allied_services as string[] | null) ?? [],
      travel_services: (c?.travel_financial_services as string[] | null) ?? [],
    });
    setLoading(false);
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  const nameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of catalogue) {
      const code = s.service_code || s.id;
      m.set(code, s.service_name);
    }
    return m;
  }, [catalogue]);

  const totalCount = useMemo(
    () =>
      DISPLAY_GROUPS.reduce(
        (n, g) => n + g.keys.reduce((m, k) => m + (selection[k]?.length ?? 0), 0),
        0,
      ),
    [selection],
  );

  const startEdit = () => {
    setDraft(selection);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          coaching_services: draft.coaching_services,
          visa_services: draft.visa_services,
          admission_services: draft.admission_services,
          allied_services: draft.allied_services,
          travel_financial_services: draft.travel_services,
        })
        .eq("id", clientId);
      if (error) throw error;

      const diffParts: string[] = [];
      for (const g of DISPLAY_GROUPS) {
        for (const key of g.keys) {
          const before = new Set(selection[key] ?? []);
          const after = new Set(draft[key] ?? []);
          const added = [...after].filter((x) => !before.has(x));
          const removed = [...before].filter((x) => !after.has(x));
          if (added.length) diffParts.push(`+${added.length} ${g.label}`);
          if (removed.length) diffParts.push(`−${removed.length} ${g.label}`);
        }
      }
      const summary = diffParts.length ? `Services updated: ${diffParts.join(", ")}` : "Services updated";
      try {
        await appendTimeline({
          clientId,
          eventType: "services_updated",
          summary,
          metadata: {
            before: selection,
            after: draft,
          },
        });
      } catch { /* best-effort */ }

      setSelection(draft);
      setOpen(false);
      toast.success("Services updated");

      // Auto-draft an invoice for any newly added paid services that aren't already invoiced.
      try {
        const drafted = await autoDraftInvoiceForServices(clientId, draft, catalogue);
        if (drafted > 0) {
          toast.success(`Draft invoice created for ${drafted} new service${drafted === 1 ? "" : "s"}`);
        }
      } catch (e) {
        console.warn("Auto-draft invoice skipped:", e);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not save services";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 shadow-elev-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2">
          <Sparkles className="size-4 text-primary mt-0.5" />
          <div>
            <div className="font-semibold text-sm">Client services</div>
            <div className="text-xs text-muted-foreground">
              {loading ? "Loading…" : totalCount === 0 ? "No services selected yet" : `${totalCount} selected`}
            </div>
          </div>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={startEdit} disabled={loading}>
            <Pencil className="size-3.5 mr-1.5" />
            Edit services
          </Button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {DISPLAY_GROUPS.map((g) => {
          const codes = g.keys.flatMap((k) => selection[k] ?? []);
          return (
            <div key={g.label} className="rounded-md border p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{g.label}</div>
              {codes.length === 0 ? (
                <div className="text-xs text-muted-foreground">None selected</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {codes.map((code) => (
                    <Badge key={code} variant="secondary" className="font-normal">
                      {nameByCode.get(code) ?? code}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!saving) setOpen(o); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit client services</DialogTitle>
          </DialogHeader>
          <ServiceTabs value={draft} onChange={setDraft} visaLocked={false} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Save services
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}