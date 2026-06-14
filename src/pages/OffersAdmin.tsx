import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2, Tag, Users, Pencil, Ticket, Copy, History, Loader2 } from "lucide-react";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import { OfferTrackingCodes } from "@/components/offers/OfferTrackingCodes";
import { useMasterLabels } from "@/lib/masters";
import { useModulePermission } from "@/hooks/useModulePermission";
import {
  OFFER_FUNDING_LABELS,
  OFFER_FUNDING_SOURCES,
  OFFER_STATUSES,
  type OfferFundingSource,
  type OfferStatus,
  offerStatusActions,
  offerStatusClass,
  offerStatusLabel,
} from "@/lib/offers/lifecycle";
import type { Database } from "@/integrations/supabase/types";
import { PerformanceExecutiveKpiStrip } from "@/components/performance/PerformanceExecutiveKpiStrip";
import { PerformanceOfferLifecycleStrip } from "@/components/performance/PerformanceOfferLifecycleStrip";
import { PerformanceOfferManagementTable } from "@/components/performance/PerformanceOfferManagementTable";
import { PerformanceOfferConflictPanel } from "@/components/performance/PerformanceOfferConflictPanel";
import {
  PerformanceOfferProposalPanel,
  type OfferProposalPreview,
} from "@/components/performance/PerformanceOfferProposalPanel";
import { usePerformancePeriod } from "@/contexts/PerformancePeriodContext";
import {
  filterOffersByLifecycleStep,
  lifecycleCounts,
  type OfferLifecycleStep,
} from "@/incentives/lib/offerManagementLogic";

type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
type Offer = OfferRow;
interface Group {
  id: string;
  name: string;
  description: string | null;
}
interface Client {
  id: string;
  full_name: string;
  email: string | null;
}

export default function OffersAdmin() {
  const { loading, hasRole } = useAuth();
  const { canView, canEdit, loading: permLoading } = useModulePermission("offers");
  const allowed = canView || hasRole(["manager", "administrator"]);
  const canEditOffers = canEdit || hasRole(["manager", "administrator"]);
  if (loading || permLoading) return null;
  if (!allowed) return <Navigate to="/" replace />;
  return (
    <AppLayout>
      <PageHeader title="Offers & Discounts" />
      <div className="p-6 max-w-7xl mx-auto">
        <Tabs defaultValue="offers">
          <TabsList>
            <TabsTrigger value="offers">
              <Tag className="size-4 mr-1" />
              Offers
            </TabsTrigger>
            <TabsTrigger value="groups">
              <Users className="size-4 mr-1" />
              Groups (Legacy)
            </TabsTrigger>
            <TabsTrigger value="codes">
              <Ticket className="size-4 mr-1" />
              Tracking codes
            </TabsTrigger>
          </TabsList>
          <TabsContent value="offers" className="pt-4">
            <OffersTab canEdit={canEditOffers} />
          </TabsContent>
          <TabsContent value="groups" className="pt-4">
            <GroupsTab />
          </TabsContent>
          <TabsContent value="codes" className="pt-4">
            <OfferTrackingCodes />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

export function OffersTab({ canEdit, layout = "cards" }: { canEdit: boolean; layout?: "cards" | "cms" }) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<OfferLifecycleStep | "all">("all");
  const [historyOffer, setHistoryOffer] = useState<Offer | null>(null);
  const [historyRows, setHistoryRows] = useState<
    { from_status: string | null; to_status: string; note: string | null; created_at: string }[]
  >([]);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const isCms = layout === "cms";
  const { period: periodKey } = usePerformancePeriod();
  const [dashboard, setDashboard] = useState<{
    active_count: number;
    pending_review: number;
    draft_count: number;
    expiring_within_14d: number;
    redemptions_in_period: number;
  } | null>(null);
  const [dashboardBusy, setDashboardBusy] = useState(false);
  const [proposalPreview, setProposalPreview] = useState<OfferProposalPreview[]>([]);
  const [proposalsBusy, setProposalsBusy] = useState(false);

  const load = async () => {
    setOffersLoading(true);
    const { data, error } = await supabase.from("offers").select("*").order("created_at", { ascending: false });
    if (error) {
      toast.error(formatSupabaseError(error, "Could not load offers"));
      setOffersLoading(false);
      return;
    }
    setOffers((data ?? []) as Offer[]);
    setOffersLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!isCms) return;
    let cancelled = false;
    (async () => {
      setDashboardBusy(true);
      const { data } = await supabase.rpc("fn_offer_studio_dashboard", { _period_key: periodKey });
      if (!cancelled) {
        setDashboard(data as typeof dashboard);
        setDashboardBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCms, periodKey]);

  useEffect(() => {
    if (!isCms) return;
    let cancelled = false;
    (async () => {
      setProposalsBusy(true);
      const { data } = await supabase
        // @ts-expect-error promotion_requests not in generated types yet (PH-R-016)
        .from("promotion_requests")
        .select("id, title, status, requester:profiles!promotion_requests_requested_by_fkey(full_name)")
        .in("status", ["pending", "submitted", "manager_review"])
        .order("created_at", { ascending: false })
        .limit(3);
      if (cancelled) return;
      setProposalPreview(
        ((data ?? []) as { id: string; title: string; status: string; requester?: { full_name: string | null } | null }[]).map(
          (r) => ({
            id: r.id,
            title: r.title,
            requesterName: r.requester?.full_name ?? "Unknown",
            statusLabel: r.status.replace(/_/g, " "),
            statusClass: "bg-amber-100 text-amber-800",
          }),
        ),
      );
      setProposalsBusy(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isCms]);

  const filtered =
    statusFilter === "all" ? offers : offers.filter((o) => (o.status ?? "draft") === statusFilter);
  const cmsFiltered = filterOffersByLifecycleStep(offers, lifecycleFilter);
  const lifecycleBucketCounts = lifecycleCounts(offers);

  const remove = async (id: string) => {
    if (!canEdit || !confirm("Delete this offer?")) return;
    const { error } = await supabase.from("offers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  const setStatus = async (id: string, to: OfferStatus) => {
    if (statusBusyId) return;
    setStatusBusyId(id);
    try {
      const { data, error } = await supabase.rpc("fn_offer_set_status", {
        _offer_id: id,
        _to_status: to,
      });
      if (error) throw error;
      if (data) {
        setOffers((prev) => prev.map((o) => (o.id === id ? ({ ...o, ...(data as Offer) } as Offer) : o)));
      }
      toast.success(`Status → ${offerStatusLabel(to)}`);
      await load();
    } catch (e: unknown) {
      toast.error(formatSupabaseError(e, "Could not update offer status"));
    } finally {
      setStatusBusyId(null);
    }
  };

  const cloneOffer = async (id: string) => {
    const { data: newId, error } = await supabase.rpc("fn_clone_offer", { _offer_id: id });
    if (error) toast.error(error.message);
    else {
      toast.success("Offer cloned as draft");
      await load();
      if (newId) {
        const { data: cloned } = await supabase.from("offers").select("*").eq("id", newId).maybeSingle();
        if (cloned) {
          setEditing(cloned as Offer);
          setOpen(true);
        }
      }
    }
  };

  const loadHistory = async (offer: Offer) => {
    setHistoryOffer(offer);
    const { data } = await supabase
      .from("offer_status_history")
      .select("from_status, to_status, note, created_at")
      .eq("offer_id", offer.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setHistoryRows((data ?? []) as typeof historyRows);
  };

  return (
    <div className="space-y-4">
      {isCms ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm ph-muted">Full lifecycle — percentage, fixed, bundle, and seasonal promotions.</p>
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link to="/performance/offers/new">Create offer (wizard)</Link>
                </Button>
                <Button
                  onClick={() => {
                    setEditing(null);
                    setOpen(true);
                  }}
                >
                  <Plus className="size-4 mr-1" />
                  Quick create
                </Button>
              </div>
            )}
          </div>
          <PerformanceExecutiveKpiStrip
            loading={dashboardBusy || offersLoading}
            items={[
              {
                module: "offers",
                label: "Live offers",
                value: String(dashboard?.active_count ?? 0),
                hint: `${dashboard?.pending_review ?? 0} pending review`,
              },
              {
                module: "wallet",
                label: "Expiring ≤14d",
                value: String(dashboard?.expiring_within_14d ?? 0),
                hint: `${dashboard?.draft_count ?? 0} drafts`,
              },
              {
                module: "cash",
                label: `Redemptions · ${periodKey}`,
                value: String(dashboard?.redemptions_in_period ?? 0),
                hint: "Period-scoped redemptions",
              },
              {
                module: "offers",
                label: "In library",
                value: String(offers.length),
                hint: "All lifecycle statuses",
              },
            ]}
          />
          <PerformanceOfferLifecycleStrip
            active={lifecycleFilter}
            counts={lifecycleBucketCounts}
            onSelect={setLifecycleFilter}
          />
          <PerformanceOfferManagementTable
            offers={cmsFiltered}
            loading={offersLoading}
            canEdit={canEdit}
            statusBusyId={statusBusyId}
            onEdit={(o) => {
              setEditing(o);
              setOpen(true);
            }}
            onClone={cloneOffer}
            onRemove={remove}
            onHistory={loadHistory}
            onSetStatus={setStatus}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PerformanceOfferConflictPanel />
            <PerformanceOfferProposalPanel items={proposalPreview} loading={proposalsBusy} />
          </div>
        </>
      ) : (
        <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {OFFER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {offerStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canEdit && (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4 mr-1" />
            New offer
          </Button>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground md:col-span-2">
            No offers match this filter.
          </Card>
        )}
        {filtered.map((o) => (
          <Card key={o.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{o.title}</div>
                <div className="text-xs text-muted-foreground">
                  {o.discount_type === "percentage" ? `${o.discount_value}% off` : `₹${o.discount_value} off`}
                  {o.promo_code ? ` · code ${o.promo_code}` : ""}
                  {o.version > 1 ? ` · v${o.version}` : ""}
                </div>
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                <Button size="icon" variant="ghost" title="Status history" onClick={() => loadHistory(o)}>
                  <History className="size-4" />
                </Button>
                {canEdit && (
                  <>
                    <Button size="icon" variant="ghost" title="Clone" onClick={() => cloneOffer(o.id)}>
                      <Copy className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(o);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(o.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded ${offerStatusClass(o.status)}`}>
                {offerStatusLabel(o.status)}
              </span>
              <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-800">
                {OFFER_FUNDING_LABELS[(o.funding_source ?? "future_link") as OfferFundingSource]}
              </span>
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary capitalize">{o.audience}</span>
              {o.valid_to && (
                <span className="text-muted-foreground">until {new Date(o.valid_to).toLocaleDateString()}</span>
              )}
            </div>
            {canEdit && offerStatusActions(o.status).length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {offerStatusActions(o.status).map((a) => (
                  <Button
                    key={a.key}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={!!statusBusyId}
                    onClick={() => setStatus(o.id, a.key)}
                  >
                    {statusBusyId === o.id ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                    {a.label}
                  </Button>
                ))}
              </div>
            )}
            {o.description && <div className="text-xs text-muted-foreground">{o.description}</div>}
          </Card>
        ))}
      </div>
        </>
      )}
      <OfferDialog open={open} onOpenChange={setOpen} offer={editing} onSaved={load} canEdit={canEdit} />
      <Dialog open={!!historyOffer} onOpenChange={(v) => !v && setHistoryOffer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Status history — {historyOffer?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto text-sm">
            {historyRows.length === 0 && (
              <p className="text-muted-foreground text-xs">No transitions recorded yet.</p>
            )}
            {historyRows.map((h, i) => (
              <div key={i} className="border-b pb-2 last:border-0">
                <div>
                  {h.from_status ? offerStatusLabel(h.from_status) : "—"} → {offerStatusLabel(h.to_status)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(h.created_at).toLocaleString()}
                  {h.note ? ` · ${h.note}` : ""}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OfferDialog({
  open,
  onOpenChange,
  offer,
  onSaved,
  canEdit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  offer: Offer | null;
  onSaved: () => void;
  canEdit: boolean;
}) {
  const [form, setForm] = useState<Partial<Offer>>({
    discount_type: "percentage",
    discount_value: 0,
    audience: "global",
    status: "draft",
    funding_source: "future_link",
  });
  const [groups, setGroups] = useState<Group[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selGroups, setSelGroups] = useState<Set<string>>(new Set());
  const [selClients, setSelClients] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  // Phase 3: country + service targeting (service = library composite code)
  const countryOptions = useMasterLabels("countries");
  const [serviceOptions, setServiceOptions] = useState<{ id: string; service_name: string }[]>([]);
  const [selCountries, setSelCountries] = useState<Set<string>>(new Set());
  const [selServices, setSelServices] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      offer ?? {
        discount_type: "percentage",
        discount_value: 0,
        audience: "global",
        status: "draft",
        funding_source: "future_link",
      },
    );
    supabase
      .from("offer_groups")
      .select("*")
      .order("name")
      .then(({ data }) => setGroups((data ?? []) as Group[]));
    import("@/lib/leads")
      .then(({ fetchAllServiceCatalogue }) => fetchAllServiceCatalogue())
      .then((items) =>
        setServiceOptions(
          items.map((s) => ({
            id: s.service_code ?? s.id,
            service_name: s.service_name,
          })),
        ),
      )
      .catch(() => setServiceOptions([]));
    // Phase 3: seed country/service selections from the offer being edited
    setSelCountries(new Set(offer?.target_countries ?? []));
    setSelServices(new Set(offer?.applicable_services ?? []));
    if (offer) {
      supabase
        .from("offer_audience_targets")
        .select("*")
        .eq("offer_id", offer.id)
        .then(({ data }) => {
          setSelGroups(new Set((data ?? []).filter((t: any) => t.group_id).map((t: any) => t.group_id)));
          setSelClients(new Set((data ?? []).filter((t: any) => t.client_id).map((t: any) => t.client_id)));
        });
    } else {
      setSelGroups(new Set());
      setSelClients(new Set());
    }
  }, [open, offer]);

  useEffect(() => {
    if (form.audience !== "individual" || !open) return;
    const t = setTimeout(async () => {
      const q = supabase.from("clients").select("id, full_name, email").order("full_name").limit(50);
      const { data } = search ? await q.ilike("full_name", `%${search}%`) : await q;
      setClients((data ?? []) as Client[]);
    }, 200);
    return () => clearTimeout(t);
  }, [search, form.audience, open]);

  const save = async () => {
    if (!canEdit || saving) return;
    if (!form.title) {
      toast.error("Title required");
      return;
    }
    const nextStatus = (form.status ?? "draft") as OfferStatus;
    const payload = {
      title: form.title,
      description: form.description ?? null,
      promo_code: form.promo_code || null,
      discount_type: form.discount_type,
      discount_value: form.discount_value ?? 0,
      valid_from: form.valid_from || null,
      valid_to: form.valid_to || null,
      audience: form.audience ?? "global",
      target_countries: Array.from(selCountries),
      applicable_services: Array.from(selServices),
      funding_source: (form.funding_source ?? "future_link") as OfferFundingSource,
      fl_contribution_pct:
        form.funding_source === "joint" ? Number(form.fl_contribution_pct ?? 50) : form.funding_source === "future_link" ? 100 : null,
      university_contribution_pct:
        form.funding_source === "joint"
          ? Number(form.university_contribution_pct ?? 50)
          : form.funding_source === "university"
            ? 100
            : null,
    };
    setSaving(true);
    try {
      let offerId = offer?.id;
      if (offer) {
        const { error } = await supabase.from("offers").update(payload).eq("id", offer.id);
        if (error) throw error;
        if ((offer.status ?? "draft") !== nextStatus) {
          const { error: statusError } = await supabase.rpc("fn_offer_set_status", {
            _offer_id: offer.id,
            _to_status: nextStatus,
          });
          if (statusError) throw statusError;
        }
      } else {
        const { data, error } = await supabase
          .from("offers")
          .insert({ ...payload, status: "draft" as OfferStatus })
          .select("id")
          .single();
        if (error) throw error;
        offerId = data.id;
      }
      // Replace audience targets
      if (offerId) {
        await supabase.from("offer_audience_targets").delete().eq("offer_id", offerId);
        const rows: any[] = [];
        if (payload.audience === "group") selGroups.forEach((g) => rows.push({ offer_id: offerId, group_id: g }));
        if (payload.audience === "individual") selClients.forEach((c) => rows.push({ offer_id: offerId, client_id: c }));
        if (rows.length) await supabase.from("offer_audience_targets").insert(rows);
      }
      toast.success("Saved");
      onSaved();
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(formatSupabaseError(e, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{offer ? "Edit offer" : "New offer"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Discount type</Label>
              <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="flat">Flat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input
                type="number"
                value={form.discount_value ?? 0}
                onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Promo code</Label>
              <Input value={form.promo_code ?? ""} onChange={(e) => setForm({ ...form, promo_code: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Valid from</Label>
              <Input
                type="date"
                value={form.valid_from?.slice(0, 10) ?? ""}
                onChange={(e) => setForm({ ...form, valid_from: e.target.value || null })}
              />
            </div>
            <div>
              <Label>Valid to</Label>
              <Input
                type="date"
                value={form.valid_to?.slice(0, 10) ?? ""}
                onChange={(e) => setForm({ ...form, valid_to: e.target.value || null })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Status</Label>
              <Select
                value={form.status ?? "draft"}
                onValueChange={(v) => setForm({ ...form, status: v as OfferStatus })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OFFER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {offerStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Active / Expiring soon sync the legacy active flag for portal & invoices.
              </p>
            </div>
            <div>
              <Label>Funding source</Label>
              <Select
                value={form.funding_source ?? "future_link"}
                onValueChange={(v) => setForm({ ...form, funding_source: v as OfferFundingSource })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OFFER_FUNDING_SOURCES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {OFFER_FUNDING_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.funding_source === "joint" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>FL share %</Label>
                <Input
                  type="number"
                  value={form.fl_contribution_pct ?? 50}
                  onChange={(e) => setForm({ ...form, fl_contribution_pct: Number(e.target.value) })}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label>University share %</Label>
                <Input
                  type="number"
                  value={form.university_contribution_pct ?? 50}
                  onChange={(e) => setForm({ ...form, university_contribution_pct: Number(e.target.value) })}
                  disabled={!canEdit}
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Target countries (optional)</Label>
              <div className="text-xs text-muted-foreground mb-1">Empty = all countries.</div>
              <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                {countryOptions.length === 0 && (
                  <div className="text-xs text-muted-foreground">No countries in master list.</div>
                )}
                {countryOptions.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selCountries.has(c)}
                      onChange={(e) => {
                        const s = new Set(selCountries);
                        e.target.checked ? s.add(c) : s.delete(c);
                        setSelCountries(s);
                      }}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Applicable services (optional)</Label>
              <div className="text-xs text-muted-foreground mb-1">Empty = all services.</div>
              <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                {serviceOptions.length === 0 && (
                  <div className="text-xs text-muted-foreground">No active services.</div>
                )}
                {serviceOptions.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selServices.has(s.id)}
                      onChange={(e) => {
                        const next = new Set(selServices);
                        e.target.checked ? next.add(s.id) : next.delete(s.id);
                        setSelServices(next);
                      }}
                    />
                    {s.service_name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div>
            <Label>Audience</Label>
            <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v as Offer["audience"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">All clients (global)</SelectItem>
                <SelectItem value="group">Specific groups (legacy)</SelectItem>
                <SelectItem value="individual">Specific clients</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.audience === "group" && (
            <div className="space-y-1 max-h-48 overflow-y-auto border rounded p-2">
              {groups.length === 0 && (
                <div className="text-xs text-muted-foreground">No groups yet — create one in the Groups tab.</div>
              )}
              {groups.map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selGroups.has(g.id)}
                    onChange={(e) => {
                      const s = new Set(selGroups);
                      e.target.checked ? s.add(g.id) : s.delete(g.id);
                      setSelGroups(s);
                    }}
                  />
                  {g.name}
                </label>
              ))}
            </div>
          )}
          {form.audience === "individual" && (
            <div className="space-y-2">
              <Input placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="text-xs text-muted-foreground">{selClients.size} selected</div>
              <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-1">
                {clients.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selClients.has(c.id)}
                      onChange={(e) => {
                        const s = new Set(selClients);
                        e.target.checked ? s.add(c.id) : s.delete(c.id);
                        setSelClients(s);
                      }}
                    />
                    <span className="flex-1">{c.full_name}</span>
                    <span className="text-xs text-muted-foreground">{c.email}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {canEdit && (
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                Save
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GroupsTab() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Client[]>([]);

  const load = async () => {
    const { data } = await supabase.from("offer_groups").select("*").order("name");
    setGroups((data ?? []) as Group[]);
  };
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    const { error } = await supabase
      .from("offer_groups")
      .insert({ name: name.trim(), description: desc.trim() || null });
    if (error) toast.error(error.message);
    else {
      setName("");
      setDesc("");
      load();
      toast.success("Group created");
    }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete group?")) return;
    await supabase.from("offer_groups").delete().eq("id", id);
    load();
  };

  const loadMembers = async (g: Group) => {
    setActiveGroup(g);
    const { data } = await supabase
      .from("offer_group_members")
      .select("client_id, clients(id, full_name, email)")
      .eq("group_id", g.id);
    setMembers((data ?? []).map((d: any) => d.clients).filter(Boolean));
  };
  useEffect(() => {
    if (!activeGroup) return;
    const t = setTimeout(async () => {
      const q = supabase.from("clients").select("id, full_name, email").order("full_name").limit(30);
      const { data } = search ? await q.ilike("full_name", `%${search}%`) : await q;
      setResults((data ?? []) as Client[]);
    }, 200);
    return () => clearTimeout(t);
  }, [search, activeGroup]);

  const addMember = async (cid: string) => {
    if (!activeGroup) return;
    await supabase.from("offer_group_members").insert({ group_id: activeGroup.id, client_id: cid });
    loadMembers(activeGroup);
  };
  const removeMember = async (cid: string) => {
    if (!activeGroup) return;
    await supabase.from("offer_group_members").delete().eq("group_id", activeGroup.id).eq("client_id", cid);
    loadMembers(activeGroup);
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Groups</h3>
        <div className="space-y-2">
          <Input placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea
            placeholder="Description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
          />
          <Button onClick={create} size="sm">
            <Plus className="size-4 mr-1" />
            Create group
          </Button>
        </div>
        <div className="space-y-1 pt-3 border-t">
          {groups.map((g) => (
            <div
              key={g.id}
              className={`flex items-center gap-2 p-2 rounded cursor-pointer ${activeGroup?.id === g.id ? "bg-primary/10" : "hover:bg-muted"}`}
              onClick={() => loadMembers(g)}
            >
              <span className="flex-1 text-sm">{g.name}</span>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(g.id);
                }}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">{activeGroup ? `Members of ${activeGroup.name}` : "Select a group"}</h3>
        {activeGroup && (
          <>
            <div className="space-y-1">
              {members.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{c.full_name}</span>
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => removeMember(c.id)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
              {members.length === 0 && <div className="text-xs text-muted-foreground">No members yet.</div>}
            </div>
            <div className="pt-3 border-t space-y-2">
              <Input placeholder="Search clients to add…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {results
                  .filter((c) => !members.some((m) => m.id === c.id))
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => addMember(c.id)}
                      className="flex items-center gap-2 text-sm w-full text-left p-1 hover:bg-muted rounded"
                    >
                      <Plus className="size-3" />
                      <span>{c.full_name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{c.email}</span>
                    </button>
                  ))}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
