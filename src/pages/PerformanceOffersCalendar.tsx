import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { OffersStudioNav } from "@/components/offers/OffersStudioNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useModulePermission } from "@/hooks/useModulePermission";
import { toast } from "sonner";
import { CalendarDays, Plus, RefreshCw } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TYPE_COLORS: Record<string, string> = {
  festival: "bg-purple-600",
  intake: "bg-blue-600",
  branch: "bg-emerald-600",
  seasonal: "bg-amber-600",
  other: "bg-slate-600",
};

interface CampaignRow {
  id: string;
  name: string;
  campaign_type: string;
  start_date: string;
  end_date: string;
  owner_name: string | null;
  status: string;
  linked_offer_id: string | null;
  notes: string | null;
}

interface OfferOption {
  id: string;
  title: string;
}

export default function PerformanceOffersCalendar() {
  const year = new Date().getFullYear();
  const { loading, hasRole } = useAuth();
  const { canView, canEdit, loading: permLoading } = useModulePermission("offers");
  const allowed = canView || hasRole(["manager", "administrator"]);
  const canManage = canEdit || hasRole(["manager", "admin", "administrator"]);
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [offers, setOffers] = useState<OfferOption[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [campaignType, setCampaignType] = useState("seasonal");
  const [startDate, setStartDate] = useState(`${year}-06-01`);
  const [endDate, setEndDate] = useState(`${year}-06-30`);
  const [ownerName, setOwnerName] = useState("");
  const [linkedOfferId, setLinkedOfferId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    const [c, o] = await Promise.all([
      supabase
        .from("campaign_calendar")
        .select("id, name, campaign_type, start_date, end_date, owner_name, status, linked_offer_id, notes")
        .gte("start_date", `${year}-01-01`)
        .lte("start_date", `${year}-12-31`)
        .order("start_date"),
      supabase.from("offers").select("id, title").in("status", ["draft", "scheduled", "active"]).order("title").limit(100),
    ]);
    if (c.error) toast.error(c.error.message);
    else setRows((c.data ?? []) as CampaignRow[]);
    if (!o.error) setOffers((o.data ?? []) as OfferOption[]);
    setBusy(false);
  }, [year]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const byMonth = useMemo(() => {
    const map = new Map<number, CampaignRow[]>();
    for (let i = 0; i < 12; i++) map.set(i, []);
    for (const r of rows) {
      const m = new Date(r.start_date + "T00:00:00").getMonth();
      map.get(m)?.push(r);
    }
    return map;
  }, [rows]);

  async function addCampaign() {
    if (!canManage || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("campaign_calendar").insert({
      name: name.trim(),
      campaign_type: campaignType,
      start_date: startDate,
      end_date: endDate,
      owner_name: ownerName.trim() || null,
      linked_offer_id: linkedOfferId || null,
      notes: notes.trim() || null,
      status: "planned",
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Campaign scheduled");
    setName("");
    setNotes("");
    load();
  }

  if (loading || permLoading) return null;
  if (!allowed) return <Navigate to="/" replace />;

  const currentMonth = new Date().getMonth();

  return (
    <AppLayout>
      <PerformanceHubHeader
        title="Promotions calendar"
        subtitle={`Corporate calendar ${year} — festivals, intakes, branch campaigns`}
      />
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <OffersStudioNav />
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={load} disabled={busy}>
            <RefreshCw className={busy ? "size-4 mr-1 animate-spin" : "size-4 mr-1"} />
            Refresh
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="size-5 text-muted-foreground" />
            <h2 className="font-semibold">Annual grid · {year}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {MONTHS.map((label, i) => (
              <div
                key={label}
                className={`rounded-lg border p-3 min-h-[88px] ${i === currentMonth ? "bg-primary/5 border-primary/30" : "bg-card"}`}
              >
                <div className={`text-xs font-semibold mb-2 ${i === currentMonth ? "text-primary" : "text-muted-foreground"}`}>
                  {label}
                  {i === currentMonth && " · current"}
                </div>
                {(byMonth.get(i) ?? []).map((c) => (
                  <div
                    key={c.id}
                    className={`text-[10px] font-medium text-white rounded px-2 py-0.5 mb-1 ${TYPE_COLORS[c.campaign_type] ?? TYPE_COLORS.other}`}
                  >
                    {c.name}
                    {c.status === "live" && " · LIVE"}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium mb-3">All campaigns</h3>
          <div className="space-y-2">
            {rows.length === 0 && !busy && (
              <p className="text-sm text-muted-foreground">No campaigns scheduled for {year}.</p>
            )}
            {rows.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2 border rounded-lg p-3 text-sm">
                <span className="font-medium">{c.name}</span>
                <Badge variant="outline">{c.campaign_type}</Badge>
                <Badge variant={c.status === "live" ? "default" : "secondary"}>{c.status}</Badge>
                <span className="text-muted-foreground">
                  {c.start_date} → {c.end_date}
                </span>
                {c.owner_name && <span className="text-muted-foreground">· {c.owner_name}</span>}
                {c.linked_offer_id && (
                  <Link to="/performance/offers/library" className="text-primary text-xs underline">
                    Linked offer
                  </Link>
                )}
              </div>
            ))}
          </div>
        </Card>

        {canManage && (
          <Card className="p-4 space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Plus className="size-4" />
              Schedule campaign
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Diwali intake push" />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={campaignType} onValueChange={setCampaignType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="festival">Festival</SelectItem>
                    <SelectItem value="intake">Intake</SelectItem>
                    <SelectItem value="branch">Branch</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Owner</Label>
                <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="MarCom lead" />
              </div>
              <div className="space-y-1">
                <Label>Start date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>End date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Linked offer (optional)</Label>
                <Select value={linkedOfferId || "none"} onValueChange={(v) => setLinkedOfferId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {offers.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <Button onClick={addCampaign} disabled={saving || !name.trim()}>
              Schedule
            </Button>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
