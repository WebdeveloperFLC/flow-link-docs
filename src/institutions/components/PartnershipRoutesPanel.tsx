import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GitCompare, Star, X } from "lucide-react";
import { toast } from "sonner";
import type {
  CatalogStatus,
  CommissionSlab,
  PartnershipChannelType,
  UpiAggregator,
  UpiPartnershipRoute,
} from "../types/partnership";
import {
  channelLabel,
  DIRECT_ROUTE_EXISTS_MESSAGE,
  expireStaleFeeWaivers,
  findActiveDirectRoute,
  formatCommissionSummary,
  formatFeeWaiverSummary,
  formatPartnershipRouteSaveError,
  isApplicationFeeWaiverActive,
  parseCommissionSlabs,
  scorePartnershipRoutes,
  syncInstitutionPartnershipToCourseFinder,
  validateCommissionSlabs,
  validatePartnershipRouteSave,
} from "../lib/partnershipRoutes";

type SlabRow = { min_students: string; max_students: string; amount: string };

type RouteForm = {
  channel_type: PartnershipChannelType;
  aggregator_id: string;
  display_name: string;
  status: string;
  valid_from: string;
  valid_to: string;
  application_portal_url: string;
  aggregator_institution_code: string;
  commission_model: string;
  commission_rate: string;
  commission_currency: string;
  commission_slabs: SlabRow[];
  bonus_notes: string;
  payment_terms: string;
  estimated_payout_days: string;
  processing_sla_days: string;
  application_fee: string;
  application_fee_waiver: boolean;
  application_fee_waiver_from: string;
  application_fee_waiver_to: string;
  is_default_route: boolean;
  notes: string;
  default_commission_id: string;
};

const defaultSlabRows = (): SlabRow[] => [
  { min_students: "1", max_students: "4", amount: "900" },
  { min_students: "5", max_students: "8", amount: "1100" },
  { min_students: "9", max_students: "", amount: "1500" },
];

const emptyRouteForm = (): RouteForm => ({
  channel_type: "indirect",
  aggregator_id: "",
  display_name: "",
  status: "active",
  valid_from: "",
  valid_to: "",
  application_portal_url: "",
  aggregator_institution_code: "",
  commission_model: "percentage",
  commission_rate: "",
  commission_currency: "CAD",
  commission_slabs: defaultSlabRows(),
  bonus_notes: "",
  payment_terms: "",
  estimated_payout_days: "",
  processing_sla_days: "",
  application_fee: "",
  application_fee_waiver: false,
  application_fee_waiver_from: "",
  application_fee_waiver_to: "",
  is_default_route: false,
  notes: "",
  default_commission_id: "",
});

function slabsFromRoute(route: UpiPartnershipRoute): SlabRow[] {
  const parsed = parseCommissionSlabs(route);
  if (!parsed.length) return defaultSlabRows();
  return parsed.map((s) => ({
    min_students: String(s.min_students),
    max_students: s.max_students == null ? "" : String(s.max_students),
    amount: String(s.amount),
  }));
}

function parseSlabRows(rows: SlabRow[]): CommissionSlab[] {
  return rows
    .filter((r) => r.min_students.trim() || r.amount.trim())
    .map((r) => ({
      min_students: Number(r.min_students),
      max_students: r.max_students.trim() ? Number(r.max_students) : null,
      amount: Number(r.amount),
    }));
}

export function PartnershipRoutesPanel({
  institutionId,
  catalogStatus,
  promotionNotes,
  institutionPortalUrl,
  canEdit,
  onCatalogChange,
}: {
  institutionId: string;
  catalogStatus: CatalogStatus;
  promotionNotes: string | null;
  institutionPortalUrl?: string | null;
  canEdit: boolean;
  onCatalogChange: (patch: { catalog_status?: CatalogStatus; promotion_notes?: string | null }) => void;
}) {
  const [routes, setRoutes] = useState<UpiPartnershipRoute[]>([]);
  const [aggregators, setAggregators] = useState<UpiAggregator[]>([]);
  const [commissions, setCommissions] = useState<{ id: string; name: string; is_active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RouteForm>(emptyRouteForm());
  const [compareTuition, setCompareTuition] = useState("20000");

  const load = async () => {
    setLoading(true);
    await expireStaleFeeWaivers((fn) => supabase.rpc(fn));
    const [r, a, c] = await Promise.all([
      supabase
        .from("upi_partnership_routes")
        .select("*, upi_aggregators(id, name, short_code)")
        .eq("institution_id", institutionId)
        .order("priority_rank")
        .order("display_name"),
      supabase.from("upi_aggregators").select("*").eq("is_active", true).order("name"),
      supabase.from("upi_commissions").select("id, name, is_active").eq("institution_id", institutionId).order("name"),
    ]);
    if (r.error) toast.error(r.error.message);
    const mapped = (r.data ?? []).map((row: Record<string, unknown>) => {
      const agg = row.upi_aggregators as UpiPartnershipRoute["aggregator"] | null;
      const { upi_aggregators: _, ...rest } = row;
      return { ...rest, aggregator: agg ?? null } as UpiPartnershipRoute;
    });
    setRoutes(mapped);
    setAggregators((a.data ?? []) as UpiAggregator[]);
    setCommissions((c.data ?? []) as any[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [institutionId]);

  const activeRoutes = useMemo(() => routes.filter((r) => r.status === "active"), [routes]);
  const existingActiveDirectRoute = useMemo(() => findActiveDirectRoute(routes), [routes]);
  const compareScores = useMemo(
    () => scorePartnershipRoutes(activeRoutes, { tuition: Number(compareTuition) || undefined }),
    [activeRoutes, compareTuition],
  );

  const openNew = (channel: PartnershipChannelType) => {
    if (channel === "direct" && existingActiveDirectRoute) {
      return toast.error(DIRECT_ROUTE_EXISTS_MESSAGE);
    }
    setEditingId(null);
    const base = emptyRouteForm();
    base.channel_type = channel;
    if (channel === "direct") base.display_name = "Direct tie-up";
    if (channel === "student_direct") base.display_name = "Student applies directly (no agency)";
    setForm(base);
    setOpen(true);
  };

  const openEdit = (route: UpiPartnershipRoute) => {
    setEditingId(route.id);
    setForm({
      channel_type: route.channel_type,
      aggregator_id: route.aggregator_id ?? "",
      display_name: route.display_name,
      status: route.status,
      valid_from: route.valid_from ?? "",
      valid_to: route.valid_to ?? "",
      application_portal_url: route.application_portal_url ?? "",
      aggregator_institution_code: route.aggregator_institution_code ?? "",
      commission_model: route.commission_model ?? "percentage",
      commission_rate: route.commission_rate != null ? String(route.commission_rate) : "",
      commission_currency: route.commission_currency ?? "CAD",
      commission_slabs: slabsFromRoute(route),
      bonus_notes: route.bonus_notes ?? "",
      payment_terms: route.payment_terms ?? "",
      estimated_payout_days: route.estimated_payout_days != null ? String(route.estimated_payout_days) : "",
      processing_sla_days: route.processing_sla_days != null ? String(route.processing_sla_days) : "",
      application_fee: route.application_fee != null ? String(route.application_fee) : "",
      application_fee_waiver: route.application_fee_waiver ?? false,
      application_fee_waiver_from: route.application_fee_waiver_from ?? "",
      application_fee_waiver_to: route.application_fee_waiver_to ?? "",
      is_default_route: route.is_default_route,
      notes: route.notes ?? "",
      default_commission_id: route.default_commission_id ?? "",
    });
    setOpen(true);
  };

  const saveRoute = async () => {
    if (!canEdit) return;
    if (!form.display_name.trim()) return toast.error("Display name is required");
    if (form.channel_type === "indirect" && !form.aggregator_id) {
      return toast.error("Select an aggregator for indirect routes");
    }

    const agg = aggregators.find((x) => x.id === form.aggregator_id);
    const isSlab = form.commission_model === "slab";
    const slabs = isSlab ? parseSlabRows(form.commission_slabs) : [];
    if (isSlab) {
      const slabErr = validateCommissionSlabs(slabs);
      if (slabErr) return toast.error(slabErr);
    }
    if (form.application_fee_waiver) {
      if (!form.application_fee_waiver_from || !form.application_fee_waiver_to) {
        return toast.error("Set both waiver start and end dates");
      }
      if (form.application_fee_waiver_from > form.application_fee_waiver_to) {
        return toast.error("Waiver end date must be on or after start date");
      }
    }

    const duplicateErr = validatePartnershipRouteSave(
      {
        channel_type: form.channel_type,
        status: form.status,
        aggregator_id: form.aggregator_id || null,
      },
      routes,
      editingId,
    );
    if (duplicateErr) return toast.error(duplicateErr);

    const payload = {
      institution_id: institutionId,
      channel_type: form.channel_type,
      aggregator_id: form.channel_type === "indirect" ? form.aggregator_id : null,
      display_name: form.display_name.trim(),
      status: form.status,
      valid_from: form.valid_from || null,
      valid_to: form.valid_to || null,
      application_portal_url: form.application_portal_url.trim() || agg?.default_portal_url || null,
      aggregator_institution_code: form.aggregator_institution_code.trim() || null,
      commission_model: form.commission_model || null,
      commission_rate: isSlab ? null : form.commission_rate ? Number(form.commission_rate) : null,
      commission_slabs: isSlab ? slabs : [],
      commission_currency: form.commission_currency || "CAD",
      bonus_notes: form.bonus_notes.trim() || null,
      payment_terms: form.payment_terms.trim() || agg?.default_payment_terms || null,
      estimated_payout_days: form.estimated_payout_days ? Number(form.estimated_payout_days) : null,
      processing_sla_days: form.processing_sla_days ? Number(form.processing_sla_days) : null,
      application_fee: form.application_fee ? Number(form.application_fee) : null,
      application_fee_waiver: form.application_fee_waiver,
      application_fee_waiver_from: form.application_fee_waiver ? form.application_fee_waiver_from : null,
      application_fee_waiver_to: form.application_fee_waiver ? form.application_fee_waiver_to : null,
      is_default_route: form.is_default_route,
      notes: form.notes.trim() || null,
      default_commission_id: form.default_commission_id || null,
    };

    const { error } = editingId
      ? await supabase.from("upi_partnership_routes").update(payload).eq("id", editingId)
      : await supabase.from("upi_partnership_routes").insert(payload);
    if (error) {
      return toast.error(
        formatPartnershipRouteSaveError(error, { aggregatorName: agg?.name ?? null }),
      );
    }

    const hasDirect = form.channel_type === "direct" && form.status === "active";
    const { data: inst } = await supabase
      .from("upi_institutions")
      .select("is_partner")
      .eq("id", institutionId)
      .maybeSingle();
    const isDirectPartner =
      hasDirect ||
      routes.some((r) => r.channel_type === "direct" && r.status === "active" && r.id !== editingId);
    if (isDirectPartner !== inst?.is_partner) {
      await syncInstitutionPartnershipToCourseFinder(institutionId, !!isDirectPartner);
    }

    toast.success(editingId ? "Route updated" : "Route added");
    setOpen(false);
    load();
  };

  const removeRoute = async (route: UpiPartnershipRoute) => {
    if (!canEdit) return;
    if (!confirm(`Remove route "${route.display_name}"?`)) return;
    const { error } = await supabase.from("upi_partnership_routes").delete().eq("id", route.id);
    if (error) return toast.error(error.message);
    toast.success("Route removed");
    load();
  };

  return (
    <Card className="p-6 space-y-4 max-w-3xl">
      <div>
        <div className="text-sm font-medium">Catalog & partnerships</div>
        <p className="text-xs text-muted-foreground mt-1">
          Course Finder catalog visibility is independent of institution governance status. Add direct, indirect, or student-direct routes below.
        </p>
      </div>

      <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm">Course Finder catalog visibility</Label>
          <Select
            disabled={!canEdit}
            value={catalogStatus}
            onValueChange={(v) => onCatalogChange({ catalog_status: v as CatalogStatus })}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="promoted">Promoted</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Textarea
          disabled={!canEdit}
          placeholder="Promotion notes (e.g. no agency agreement — student applies to uni directly)"
          className="text-sm min-h-[60px]"
          value={promotionNotes ?? ""}
          onChange={(e) => onCatalogChange({ promotion_notes: e.target.value || null })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={!!existingActiveDirectRoute}
                title={existingActiveDirectRoute ? DIRECT_ROUTE_EXISTS_MESSAGE : undefined}
                onClick={() => openNew("direct")}
              >
                <Plus className="size-4 mr-1" /> Direct tie-up
              </Button>
              <Button size="sm" variant="outline" onClick={() => openNew("indirect")}>
                <Plus className="size-4 mr-1" /> Indirect route
              </Button>
              <Button size="sm" variant="outline" onClick={() => openNew("student_direct")}>
                <Plus className="size-4 mr-1" /> Student direct
              </Button>
            </>
          )}
          {activeRoutes.length >= 2 && (
            <Button size="sm" variant="secondary" onClick={() => setCompareOpen(true)}>
              <GitCompare className="size-4 mr-1" /> Compare routes
            </Button>
          )}
        </div>
        {existingActiveDirectRoute && canEdit && (
          <p className="text-xs text-muted-foreground">
            {DIRECT_ROUTE_EXISTS_MESSAGE}{" "}
            <button
              type="button"
              className="text-primary underline underline-offset-2 hover:no-underline"
              onClick={() => openEdit(existingActiveDirectRoute)}
            >
              Edit existing route
            </button>
          </p>
        )}
      </div>

      {loading && <div className="text-sm text-muted-foreground py-4">Loading routes…</div>}
      {!loading && routes.length === 0 && (
        <div className="text-sm text-muted-foreground py-4 border border-dashed rounded-lg px-4 text-center">
          No partnership routes — promotion only. Add direct or indirect routes when available.
        </div>
      )}

      <div className="space-y-2">
        {routes.map((route) => {
          const aggName =
            route.aggregator?.name ??
            (route.channel_type === "indirect" ? "Unknown aggregator" : null);
          const recommended = compareScores[0]?.route.id === route.id && activeRoutes.length >= 2;
          return (
            <div
              key={route.id}
              className="flex flex-wrap items-start justify-between gap-2 border rounded-lg p-3 text-sm"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{route.display_name}</span>
                  <Badge variant="outline">{channelLabel(route.channel_type)}</Badge>
                  {aggName && <Badge variant="secondary">{aggName}</Badge>}
                  <Badge variant={route.status === "active" ? "default" : "secondary"}>{route.status}</Badge>
                  {route.is_default_route && (
                    <Badge variant="outline" className="gap-1">
                      <Star className="size-3" /> Default
                    </Badge>
                  )}
                  {recommended && (
                    <Badge className="bg-success/15 text-success border-0">Recommended</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                  {formatCommissionSummary(route) && <span>{formatCommissionSummary(route)}</span>}
                  {isApplicationFeeWaiverActive(route) && (
                    <Badge variant="outline" className="text-[10px] text-success border-success/40">
                      App fee waived
                    </Badge>
                  )}
                  {route.application_fee_waiver && !isApplicationFeeWaiverActive(route) && (
                    <span className="text-amber-600">{formatFeeWaiverSummary(route)}</span>
                  )}
                  {route.valid_to && <span>Valid until {route.valid_to}</span>}
                  {route.estimated_payout_days != null && <span>Payout ~{route.estimated_payout_days}d</span>}
                  {route.processing_sla_days != null && <span>SLA {route.processing_sla_days}d</span>}
                  {(route.default_commission_id) && (
                    <span>
                      Commission: {commissions.find((c) => c.id === route.default_commission_id)?.name ?? "Linked"}
                    </span>
                  )}
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(route)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => removeRoute(route)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit partnership route" : "Add partnership route"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Channel</Label>
              <Select
                value={form.channel_type}
                onValueChange={(v) => setForm({ ...form, channel_type: v as PartnershipChannelType })}
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct tie-up</SelectItem>
                  <SelectItem value="indirect">Indirect (aggregator)</SelectItem>
                  <SelectItem value="student_direct">Student applies directly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.channel_type === "indirect" && (
              <div className="space-y-1">
                <Label>Aggregator *</Label>
                <Select value={form.aggregator_id} onValueChange={(v) => setForm({ ...form, aggregator_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select aggregator" />
                  </SelectTrigger>
                  <SelectContent>
                    {aggregators.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {aggregators.length === 0 && (
                  <p className="text-xs text-amber-600">Add aggregators in Admin → Masters → Aggregators first.</p>
                )}
              </div>
            )}
            <div className="space-y-1">
              <Label>Display name *</Label>
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Valid from</Label>
                <Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Valid to</Label>
                <Input type="date" value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {form.commission_model !== "slab" && (
                <div className="space-y-1">
                  <Label>Commission rate</Label>
                  <Input
                    type="number"
                    value={form.commission_rate}
                    onChange={(e) => setForm({ ...form, commission_rate: e.target.value })}
                  />
                </div>
              )}
              <div className={`space-y-1 ${form.commission_model === "slab" ? "col-span-2" : ""}`}>
                <Label>Commission model</Label>
                <Select
                  value={form.commission_model}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      commission_model: v,
                      commission_slabs:
                        v === "slab" && !form.commission_slabs.length ? defaultSlabRows() : form.commission_slabs,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                    <SelectItem value="slab">Slab (volume tiers)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.commission_model === "slab" && (
              <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm">Commission slabs (students enrolled)</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setForm({
                        ...form,
                        commission_slabs: [
                          ...form.commission_slabs,
                          { min_students: "", max_students: "", amount: "" },
                        ],
                      })
                    }
                  >
                    <Plus className="size-3 mr-1" /> Add tier
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Example: 1–4 → $900, 5–8 → $1,100, 9+ → $1,500. Leave max empty for &quot;and more&quot;.
                </p>
                <div className="space-y-2">
                  {form.commission_slabs.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Min students</Label>
                        <Input
                          type="number"
                          min={1}
                          value={row.min_students}
                          onChange={(e) => {
                            const next = [...form.commission_slabs];
                            next[idx] = { ...next[idx], min_students: e.target.value };
                            setForm({ ...form, commission_slabs: next });
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max (blank = 9+)</Label>
                        <Input
                          type="number"
                          min={1}
                          placeholder="and more"
                          value={row.max_students}
                          onChange={(e) => {
                            const next = [...form.commission_slabs];
                            next[idx] = { ...next[idx], max_students: e.target.value };
                            setForm({ ...form, commission_slabs: next });
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Amount ({form.commission_currency})</Label>
                        <Input
                          type="number"
                          min={0}
                          value={row.amount}
                          onChange={(e) => {
                            const next = [...form.commission_slabs];
                            next[idx] = { ...next[idx], amount: e.target.value };
                            setForm({ ...form, commission_slabs: next });
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="shrink-0 text-destructive"
                        disabled={form.commission_slabs.length <= 1}
                        onClick={() =>
                          setForm({
                            ...form,
                            commission_slabs: form.commission_slabs.filter((_, i) => i !== idx),
                          })
                        }
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Payout days</Label>
                <Input
                  type="number"
                  value={form.estimated_payout_days}
                  onChange={(e) => setForm({ ...form, estimated_payout_days: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Processing SLA (days)</Label>
                <Input
                  type="number"
                  value={form.processing_sla_days}
                  onChange={(e) => setForm({ ...form, processing_sla_days: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Portal URL (override)</Label>
              <Input
                placeholder={institutionPortalUrl?.trim() || "Defaults to institution application portal when blank"}
                value={form.application_portal_url}
                onChange={(e) => setForm({ ...form, application_portal_url: e.target.value })}
              />
              {institutionPortalUrl?.trim() && (
                <p className="text-xs text-muted-foreground">
                  Institution default: {institutionPortalUrl}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Application fee (standard)</Label>
              <Input
                type="number"
                placeholder="e.g. 100"
                value={form.application_fee}
                onChange={(e) => setForm({ ...form, application_fee: e.target.value })}
              />
            </div>
            <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.application_fee_waiver}
                  onCheckedChange={(v) =>
                    setForm({
                      ...form,
                      application_fee_waiver: v,
                      application_fee_waiver_from: v ? form.application_fee_waiver_from : "",
                      application_fee_waiver_to: v ? form.application_fee_waiver_to : "",
                    })
                  }
                />
                <Label>Application fee waiver</Label>
              </div>
              {form.application_fee_waiver && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Waiver from *</Label>
                    <Input
                      type="date"
                      value={form.application_fee_waiver_from}
                      onChange={(e) => setForm({ ...form, application_fee_waiver_from: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Waiver until *</Label>
                    <Input
                      type="date"
                      value={form.application_fee_waiver_to}
                      onChange={(e) => setForm({ ...form, application_fee_waiver_to: e.target.value })}
                    />
                  </div>
                </div>
              )}
              {form.application_fee_waiver && (
                <p className="text-xs text-muted-foreground">
                  Waiver turns off automatically after the end date.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Bonus / offer notes</Label>
              <Textarea value={form.bonus_notes} onChange={(e) => setForm({ ...form, bonus_notes: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Default commission (Claims resolver)</Label>
              <Select
                value={form.default_commission_id || "__none__"}
                onValueChange={(v) => setForm({ ...form, default_commission_id: v === "__none__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Institution default (no route override)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Institution default</SelectItem>
                  {commissions.filter((c) => c.is_active).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used by Claims recalculate and rule resolver for students on this route.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_default_route}
                onCheckedChange={(v) => setForm({ ...form, is_default_route: v })}
              />
              <Label>Default route for this institution</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRoute}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compare partnership routes</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1 max-w-xs">
              <Label>Sample tuition for estimate</Label>
              <Input value={compareTuition} onChange={(e) => setCompareTuition(e.target.value)} type="number" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3">Route</th>
                    <th className="py-2 pr-3">Commission</th>
                    <th className="py-2 pr-3">Est. payout</th>
                    <th className="py-2 pr-3">Payout days</th>
                    <th className="py-2 pr-3">SLA</th>
                    <th className="py-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {compareScores.map((row) => (
                    <tr key={row.route.id} className="border-b">
                      <td className="py-2 pr-3 font-medium">
                        {row.route.display_name}
                        {row.rank === 1 && (
                          <Badge className="ml-2 bg-success/15 text-success border-0 text-[10px]">Best</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3">{formatCommissionSummary(row.route) ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {row.commissionEstimate != null
                          ? `${Math.round(row.commissionEstimate).toLocaleString()} ${row.route.commission_currency ?? "CAD"}`
                          : "—"}
                      </td>
                      <td className="py-2 pr-3">{row.route.estimated_payout_days ?? "—"}</td>
                      <td className="py-2 pr-3">{row.route.processing_sla_days ?? "—"}</td>
                      <td className="py-2 tabular-nums">{Math.round(row.score)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
