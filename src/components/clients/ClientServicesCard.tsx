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

const GROUP_LABELS: { key: keyof ServiceSelection; label: string }[] = [
  { key: "coaching_services", label: "Coaching" },
  { key: "visa_services", label: "Visa & Immigration" },
  { key: "admission_services", label: "Admission" },
  { key: "allied_services", label: "Allied" },
  { key: "travel_services", label: "Travel & Financial" },
];

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
    () => GROUP_LABELS.reduce((n, g) => n + (selection[g.key]?.length ?? 0), 0),
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
      for (const g of GROUP_LABELS) {
        const before = new Set(selection[g.key] ?? []);
        const after = new Set(draft[g.key] ?? []);
        const added = [...after].filter((x) => !before.has(x));
        const removed = [...before].filter((x) => !after.has(x));
        if (added.length) diffParts.push(`+${added.length} ${g.label}`);
        if (removed.length) diffParts.push(`−${removed.length} ${g.label}`);
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
        {GROUP_LABELS.map((g) => {
          const codes = selection[g.key] ?? [];
          return (
            <div key={g.key} className="rounded-md border p-3">
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