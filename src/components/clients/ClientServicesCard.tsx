import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServiceTabs, type ServiceSelection } from "@/components/leads/ServiceTabs";
import { SelectedServicesPanel } from "@/components/clients/SelectedServicesPanel";
import { fetchAllServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";
import { useServiceLabelMap } from "@/lib/service-library/useServiceLabelMap";
import { appendTimeline } from "@/lib/timeline";
import { autoDraftInvoiceForServices } from "@/lib/autoDraftInvoice";
import { toast } from "sonner";
import { Loader2, Pencil, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  isServiceRemovalRestricted,
} from "@/lib/clientProcessPolicy";
import type { PipelineProgressSnapshot } from "@/lib/clientServiceGuards";

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
  { label: "Allied & Travel", keys: ["allied_services", "travel_services"] },
];

const GROUP_LABELS: { key: keyof ServiceSelection; label: string }[] = [
  { key: "coaching_services", label: "Coaching" },
  { key: "visa_services", label: "Visa & Immigration" },
  { key: "allied_services", label: "Allied" },
  { key: "travel_services", label: "Travel" },
];

function totalServiceCount(sel: ServiceSelection): number {
  return GROUP_LABELS.reduce((n, g) => n + (sel[g.key]?.length ?? 0), 0);
}

export function ClientServicesCard({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const { isAdmin } = useAuth();
  const [selection, setSelection] = useState<ServiceSelection>(EMPTY);
  const [catalogue, setCatalogue] = useState<ServiceCatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ServiceSelection>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState<PipelineProgressSnapshot | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: stage }, cat] = await Promise.all([
      supabase
        .from("clients")
        .select("coaching_services,visa_services,admission_services,allied_services,travel_financial_services")
        .eq("id", clientId)
        .maybeSingle(),
      supabase
        .from("vw_client_current_stage")
        .select("pipeline_id, progress_percent, stage_order, stage_key")
        .eq("client_id", clientId)
        .maybeSingle(),
      fetchAllServiceCatalogue().catch(() => [] as ServiceCatalogueItem[]),
    ]);
    setPipelineProgress((stage as PipelineProgressSnapshot) ?? null);
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

  const allCodes = useMemo(
    () =>
      DISPLAY_GROUPS.flatMap((g) => g.keys.flatMap((k) => selection[k] ?? [])),
    [selection],
  );
  const nameByCode = useServiceLabelMap(allCodes, catalogue);
  const draftCodes = useMemo(
    () => GROUP_LABELS.flatMap((g) => draft[g.key] ?? []),
    [draft],
  );
  const draftLabelMap = useServiceLabelMap(draftCodes, catalogue);

  const totalCount = useMemo(
    () =>
      DISPLAY_GROUPS.reduce(
        (n, g) => n + g.keys.reduce((m, k) => m + (selection[k]?.length ?? 0), 0),
        0,
      ),
    [selection],
  );

  const removalLocked = isServiceRemovalRestricted(pipelineProgress);

  const startEdit = () => {
    setDraft(selection);
    setOpen(true);
  };

  const setDraftGuarded = (next: ServiceSelection) => {
    if (
      removalLocked &&
      !isAdmin &&
      totalServiceCount(next) < totalServiceCount(draft)
    ) {
      toast.error("Cannot remove services while the application is in progress.");
      return;
    }
    setDraft(next);
  };

  const save = async () => {
    if (
      removalLocked &&
      !isAdmin &&
      totalServiceCount(draft) < totalServiceCount(selection)
    ) {
      toast.error("Cannot remove services while the application is in progress.");
      return;
    }
    if (
      removalLocked &&
      isAdmin &&
      totalServiceCount(draft) < totalServiceCount(selection) &&
      !window.confirm(
        "Save service removals for a client whose application is already in progress?\n\nOnly continue if this is a test file.",
      )
    ) {
      return;
    }

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
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit client services</DialogTitle>
          </DialogHeader>
          <SelectedServicesPanel
            value={draft}
            catalogue={catalogue}
            labelByCode={draftLabelMap}
            onChange={setDraftGuarded}
            removalLocked={removalLocked}
          />
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-1">
            Add services
          </div>
          <ServiceTabs
            value={draft}
            onChange={setDraftGuarded}
            visaLocked={false}
            layout="inline"
            externalSelectedSummary
            catalogue={catalogue}
          />
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