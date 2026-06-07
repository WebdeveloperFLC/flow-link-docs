import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus, Pencil, Trash2, Loader2, Upload, Download, X, ShieldAlert,
  ListChecks, ChevronRight, ChevronDown, ChevronLeft, Globe, FileText, FileUp, Settings2,
  ClipboardCheck, BookOpen, Coins, Sparkles, History, GraduationCap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  ALLOWED_SERVICE_LIBRARY_COUNTRIES, ALLOWED_COUNTRY_SET,
  type Master, type Override,
  type FeeItem, type ChecklistFile, type SopTask, type SubmissionItem,
} from "@/lib/serviceLibrary";
import { AcademyContentEditor } from "@/components/service-library/admin/AcademyContentEditor";

export { ALLOWED_SERVICE_LIBRARY_COUNTRIES } from "@/lib/serviceLibrary";

const CATEGORY_OPTIONS = [
  { key: "coaching_services", label: "Coaching" },
  { key: "visa_immigration", label: "Visa & Immigration" },
  { key: "allied_services", label: "Allied" },
  { key: "travel_financial", label: "Travel & Financial" },
];

const COUNTRY_BOUND_CATEGORIES = new Set(["visa_immigration"]);

const DEFAULT_SUBMISSION_ITEMS = [
  { item_key: "documents_verified", item_label: "Documents verified" },
  { item_key: "checklist_completed", item_label: "Checklist completed" },
  { item_key: "fees_collected", item_label: "Fees collected" },
  { item_key: "client_approval_received", item_label: "Client approval received" },
  { item_key: "quality_review_completed", item_label: "Quality review completed" },
  { item_key: "submission_approved", item_label: "Submission approved" },
];

export default function ServiceLibraryAdmin() {
  const { hasRole, isAdmin } = useAuth();
  const canManage = isAdmin || hasRole(["administrator", "documentation"]);
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("id"));
  const [showNew, setShowNew] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(false);
  const [treeSearch, setTreeSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("ALL");

  const masters = useQuery({
    queryKey: ["sl-masters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_library")
        .select("*, service_library_countries(country)")
        .order("service_category").order("service").order("sub_service");
      if (error) throw error;
      return (data ?? []) as unknown as (Master & { service_library_countries: { country: string }[] })[];
    },
  });

  const log = useQuery({
    queryKey: ["sl-mig-log"],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_library_migration_log")
        .select("*").order("ran_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  // Flat categories shown without country grouping (in display order).
  const FLAT_CATEGORY_ORDER: { key: string; label: string }[] = [
    { key: "coaching_services", label: "Coaching" },
    { key: "allied_services", label: "Allied" },
    { key: "travel_financial", label: "Travel & Financial" },
  ];

  // Build:
  //  - flatGroups:      categoryLabel -> service -> Master[]
  //  - visaByCountry:   country       -> service -> Master[]  (used when no country filter)
  //  - visaForCountry:  service       -> Master[]             (used when a country is picked)
  //  - availableCountries: list of countries that have visa services (for the filter dropdown)
  const { flatGroups, visaByCountry, visaForCountry, availableCountries } = useMemo(() => {
    const q = treeSearch.trim().toLowerCase();
    const matches = (m: Master) =>
      !q || m.service.toLowerCase().includes(q) || m.sub_service.toLowerCase().includes(q);

    const flat: Record<string, Record<string, Master[]>> = {};
    const visa: Record<string, Record<string, Master[]>> = {};
    const countrySet = new Set<string>();

    for (const m of masters.data ?? []) {
      if (m.service_category === "admission_services") continue;

      if (m.service_category === "visa_immigration") {
        const countries = (m.service_library_countries ?? [])
          .map((c) => c.country)
          .filter((c) => ALLOWED_COUNTRY_SET.has(c));
        countries.forEach((c) => countrySet.add(c));
        if (!matches(m)) continue;
        // When a country filter is active, only include rows mapped to it.
        if (countryFilter !== "ALL" && !countries.includes(countryFilter)) continue;
        const buckets = countries.length ? countries : ["Unassigned"];
        for (const country of buckets) {
          if (countryFilter !== "ALL" && country !== countryFilter) continue;
          visa[country] ??= {};
          visa[country][m.service] ??= [];
          visa[country][m.service].push(m);
        }
        continue;
      }

      if (!matches(m)) continue;
      const catDef = FLAT_CATEGORY_ORDER.find((c) => c.key === m.service_category);
      if (!catDef) continue;
      flat[catDef.label] ??= {};
      flat[catDef.label][m.service] ??= [];
      flat[catDef.label][m.service].push(m);
    }

    // Sort flat: category in fixed order, service asc, sub-service asc.
    const flatSorted: Record<string, Record<string, Master[]>> = {};
    for (const { label } of FLAT_CATEGORY_ORDER) {
      if (!flat[label]) continue;
      const svcKeys = Object.keys(flat[label]).sort((a, b) => a.localeCompare(b));
      flatSorted[label] = {};
      for (const s of svcKeys) {
        flatSorted[label][s] = [...flat[label][s]].sort((a, b) =>
          a.sub_service.localeCompare(b.sub_service),
        );
      }
    }

    // Sort visa: country asc (Unassigned last), service asc, sub-service asc.
    const visaSorted: Record<string, Record<string, Master[]>> = {};
    const countryKeys = Object.keys(visa).sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
    for (const c of countryKeys) {
      const svcKeys = Object.keys(visa[c]).sort((a, b) => a.localeCompare(b));
      visaSorted[c] = {};
      for (const s of svcKeys) {
        visaSorted[c][s] = [...visa[c][s]].sort((a, b) =>
          a.sub_service.localeCompare(b.sub_service),
        );
      }
    }

    // Flat per-country view (no nested country level) when a single country is picked.
    const visaSingle: Record<string, Master[]> =
      countryFilter !== "ALL" ? visaSorted[countryFilter] ?? {} : {};

    return {
      flatGroups: flatSorted,
      visaByCountry: visaSorted,
      visaForCountry: visaSingle,
      availableCountries: Array.from(countrySet).sort((a, b) => a.localeCompare(b)),
    };
  }, [masters.data, treeSearch, countryFilter]);

  const selected = useMemo(
    () => (masters.data ?? []).find((m) => m.id === selectedId) ?? null,
    [masters.data, selectedId],
  );

  useEffect(() => {
    const id = searchParams.get("id");
    if (id && masters.data?.some((m) => m.id === id)) {
      setSelectedId(id);
    }
  }, [searchParams, masters.data]);

  if (!canManage) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-30 border-b bg-white shadow-sm">
          <div className="mx-auto flex max-w-[1400px] items-center px-4 py-3 md:px-6">
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 -ml-1" asChild>
              <Link to="/">
                <ChevronLeft className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </div>
        </header>
        <div className="p-6 grid place-items-center">
          <div className="max-w-md rounded-2xl border bg-card p-6 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-amber-500" />
            <h2 className="mt-2 text-lg font-semibold">No access</h2>
            <p className="text-sm text-muted-foreground">Admin or Documentation role required.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1400px] items-center px-4 py-3 md:px-6">
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 -ml-1" asChild>
            <Link to="/">
              <ChevronLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </header>
      <div className="p-4 md:p-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
        {log.data && !bannerHidden && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Migration summary: merged <b>{log.data.duplicates_merged}</b> duplicate rows →{" "}
              <b>{log.data.masters_remaining}</b> master records,{" "}
              <b>{log.data.country_mappings_created}</b> country mappings,{" "}
              <b>{log.data.overrides_created}</b> overrides created.
            </div>
            <Button size="sm" variant="ghost" onClick={() => setBannerHidden(true)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <ListChecks className="h-4 w-4" /> Service Library Admin
              </div>
              <h1 className="mt-1 text-2xl font-semibold">Canonical service records</h1>
              <p className="text-sm text-muted-foreground">
                Coaching, Allied, and Travel &amp; Financial are listed flat. Use the country filter to view Visa &amp; Immigration services for one country at a time.
              </p>
            </div>
            <Button onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4 mr-1" /> New record
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <aside className="lg:col-span-4 rounded-2xl border bg-white p-3 shadow-sm max-h-[80vh] overflow-auto">
            <div className="mb-2 px-1 space-y-2">
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Filter by country…" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="ALL">All countries</SelectItem>
                  {availableCountries.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={treeSearch}
                onChange={(e) => setTreeSearch(e.target.value)}
                placeholder="Search service or sub-service…"
                className="h-8 text-sm"
              />
            </div>
            {masters.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {!masters.isLoading &&
              Object.keys(flatGroups).length === 0 &&
              Object.keys(visaByCountry).length === 0 &&
              Object.keys(visaForCountry).length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">No records yet.</div>
              )}
            {Object.entries(flatGroups).map(([catLabel, services]) => (
              <Tree key={catLabel} label={catLabel}>
                {Object.entries(services).map(([svc, items]) => (
                  <Tree key={svc} label={svc}>
                    {items.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedId(m.id)}
                        className={`block w-full rounded-md px-2 py-1 text-left text-sm hover:bg-slate-100 ${
                          selectedId === m.id ? "bg-primary/10 text-primary font-medium" : ""
                        }`}
                      >
                        {m.sub_service}
                      </button>
                    ))}
                  </Tree>
                ))}
              </Tree>
            ))}
            {countryFilter !== "ALL" && Object.keys(visaForCountry).length > 0 && (
              <Tree label={`Visa & Immigration — ${countryFilter}`} defaultOpen>
                {Object.entries(visaForCountry).map(([svc, items]) => (
                  <Tree key={svc} label={svc}>
                    {items.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedId(m.id)}
                        className={`block w-full rounded-md px-2 py-1 text-left text-sm hover:bg-slate-100 ${
                          selectedId === m.id ? "bg-primary/10 text-primary font-medium" : ""
                        }`}
                      >
                        {m.sub_service}
                      </button>
                    ))}
                  </Tree>
                ))}
              </Tree>
            )}
            {countryFilter === "ALL" && Object.keys(visaByCountry).length > 0 && (
              <Tree label="Visa & Immigration">
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  Pick a country above to view services.
                </div>
                {Object.entries(visaByCountry).map(([country, services]) => (
                  <button
                    key={country}
                    onClick={() => setCountryFilter(country)}
                    className="block w-full rounded-md px-2 py-1 text-left text-sm hover:bg-slate-100"
                  >
                    {country}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({Object.values(services).reduce((n, arr) => n + arr.length, 0)})
                    </span>
                  </button>
                ))}
              </Tree>
            )}
          </aside>

          <section className="lg:col-span-8">
            {selected ? (
              <MasterDetail
                key={selected.id}
                master={selected}
                onChanged={() => qc.invalidateQueries({ queryKey: ["sl-masters"] })}
                onDeleted={() => {
                  setSelectedId(null);
                  qc.invalidateQueries({ queryKey: ["sl-masters"] });
                }}
              />
            ) : (
              <div className="rounded-2xl border bg-white p-8 text-center text-sm text-muted-foreground shadow-sm">
                Select a record on the left.
              </div>
            )}
          </section>
        </div>
      </div>

      {showNew && (
        <NewMasterDialog
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false);
            setSelectedId(id);
            qc.invalidateQueries({ queryKey: ["sl-masters"] });
          }}
        />
      )}
      </div>
    </div>
  );
}

function Tree({ label, defaultOpen, children }: { label: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-sm font-medium hover:bg-slate-100"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {label}
      </button>
      {open && <div className="pl-4 border-l ml-2.5">{children}</div>}
    </div>
  );
}

function NewMasterDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [service, setService] = useState("");
  const [subService, setSubService] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!category || !service.trim() || !subService.trim()) {
      toast({ title: "Fill all fields", variant: "destructive" });
      return;
    }
    const needsCountry = COUNTRY_BOUND_CATEGORIES.has(category);
    if (needsCountry && !country) {
      toast({ title: "Pick a country", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("service_library")
      .insert({ service_category: category, service: service.trim(), sub_service: subService.trim() })
      .select("id")
      .single();
    if (error) {
      setSaving(false);
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    if (needsCountry) {
      const { error: cErr } = await supabase
        .from("service_library_countries")
        .insert({ library_id: data!.id, country });
      if (cErr) {
        setSaving(false);
        toast({ title: "Country link failed", description: cErr.message, variant: "destructive" });
        return;
      }
    }
    // seed default submission checklist items
    await supabase.from("service_library_submission_checklist").insert(
      DEFAULT_SUBMISSION_ITEMS.map((x, i) => ({
        library_id: data!.id,
        item_key: x.item_key,
        item_label: x.item_label,
        is_mandatory: true,
        sort_order: i + 1,
      })),
    );
    setSaving(false);
    onCreated(data!.id);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New service record</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Service Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {COUNTRY_BOUND_CATEGORIES.has(category) && (
            <div>
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue placeholder="Choose country" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {ALLOWED_SERVICE_LIBRARY_COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Service</Label>
            <Input value={service} onChange={(e) => setService(e.target.value)} placeholder="e.g. Student Visa" />
          </div>
          <div>
            <Label>Sub-service</Label>
            <Input value={subService} onChange={(e) => setSubService(e.target.value)} placeholder="e.g. University application" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MasterDetail({
  master, onChanged, onDeleted,
}: { master: Master; onChanged: () => void; onDeleted: () => void }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b p-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {CATEGORY_OPTIONS.find((c) => c.key === master.service_category)?.label ?? master.service_category}
          </div>
          <h2 className="text-lg font-semibold">{master.service} · {master.sub_service}</h2>
        </div>
        <Button
          variant="ghost" size="sm"
          onClick={async () => {
            if (!confirm("Delete this record and all its data?")) return;
            const { error } = await supabase.from("service_library").delete().eq("id", master.id);
            if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
            toast({ title: "Deleted" });
            onDeleted();
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </header>

      <Tabs defaultValue="overview" className="p-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview"><Settings2 className="h-3.5 w-3.5 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="quickguide"><Sparkles className="h-3.5 w-3.5 mr-1" />Quick Guide</TabsTrigger>
          <TabsTrigger value="countries"><Globe className="h-3.5 w-3.5 mr-1" />Countries</TabsTrigger>
          <TabsTrigger value="checklist"><ClipboardCheck className="h-3.5 w-3.5 mr-1" />Checklist</TabsTrigger>
          <TabsTrigger value="submission"><ListChecks className="h-3.5 w-3.5 mr-1" />Submission</TabsTrigger>
          <TabsTrigger value="fees"><Coins className="h-3.5 w-3.5 mr-1" />Fees</TabsTrigger>
          <TabsTrigger value="cost"><FileText className="h-3.5 w-3.5 mr-1" />Cost Summary</TabsTrigger>
          <TabsTrigger value="process"><ChevronRight className="h-3.5 w-3.5 mr-1" />Process Flow</TabsTrigger>
          <TabsTrigger value="sop"><BookOpen className="h-3.5 w-3.5 mr-1" />Internal SOP</TabsTrigger>
          <TabsTrigger value="overrides"><Globe className="h-3.5 w-3.5 mr-1" />Overrides</TabsTrigger>
          <TabsTrigger value="content"><GraduationCap className="h-3.5 w-3.5 mr-1" />Service content</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab master={master} onChanged={onChanged} /></TabsContent>
        <TabsContent value="quickguide"><QuickGuideTab master={master} onChanged={onChanged} /></TabsContent>
        <TabsContent value="countries"><CountriesTab master={master} /></TabsContent>
        <TabsContent value="checklist"><ChecklistTab master={master} onChanged={onChanged} /></TabsContent>
        <TabsContent value="submission"><SubmissionTab master={master} /></TabsContent>
        <TabsContent value="fees"><FeesTab master={master} /></TabsContent>
        <TabsContent value="cost"><CostSummaryTab master={master} onChanged={onChanged} /></TabsContent>
        <TabsContent value="process"><ProcessFlowTab master={master} onChanged={onChanged} /></TabsContent>
        <TabsContent value="sop"><InternalSopTab master={master} onChanged={onChanged} /></TabsContent>
        <TabsContent value="overrides"><OverridesTab master={master} /></TabsContent>
        <TabsContent value="content">
          <AcademyContentEditor master={master} onChanged={onChanged} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ master, onChanged }: { master: Master; onChanged: () => void }) {
  const [order, setOrder] = useState(master.display_order);
  const [active, setActive] = useState(master.is_active);
  const save = async () => {
    const { error } = await supabase
      .from("service_library")
      .update({ display_order: order, is_active: active })
      .eq("id", master.id);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    onChanged();
  };
  return (
    <div className="space-y-3 max-w-md">
      <div>
        <Label>Display order</Label>
        <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <div className="font-medium">Active</div>
          <div className="text-xs text-muted-foreground">Inactive records are hidden from counselor view.</div>
        </div>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>
      <Button onClick={save}>Save</Button>
    </div>
  );
}

function QuickGuideTab({ master, onChanged }: { master: Master; onChanged: () => void }) {
  const [v, setV] = useState({
    quick_guide_what_to_do: master.quick_guide_what_to_do ?? "",
    quick_guide_common_mistakes: master.quick_guide_common_mistakes ?? "",
    quick_guide_escalation_rules: master.quick_guide_escalation_rules ?? "",
    quick_guide_important_reminders: master.quick_guide_important_reminders ?? "",
  });
  const save = async () => {
    const { error } = await supabase.from("service_library").update(v).eq("id", master.id);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    onChanged();
  };
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {[
        ["quick_guide_what_to_do", "What to do"],
        ["quick_guide_common_mistakes", "Common mistakes"],
        ["quick_guide_escalation_rules", "Escalation rules"],
        ["quick_guide_important_reminders", "Important reminders"],
      ].map(([key, label]) => (
        <div key={key}>
          <Label>{label}</Label>
          <Textarea
            rows={5}
            value={(v as Record<string, string>)[key]}
            onChange={(e) => setV({ ...v, [key]: e.target.value })}
          />
        </div>
      ))}
      <div className="md:col-span-2">
        <Button onClick={save}>Save Quick Guide</Button>
      </div>
    </div>
  );
}

function CountriesTab({ master }: { master: Master }) {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["sl-countries", master.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_library_countries")
        .select("country").eq("library_id", master.id);
      return ((data ?? []) as { country: string }[]).map((r) => r.country);
    },
  });
  const assigned = new Set(rows);

  const toggle = async (country: string) => {
    if (assigned.has(country)) {
      await supabase.from("service_library_countries").delete()
        .eq("library_id", master.id).eq("country", country);
    } else {
      const { error } = await supabase.from("service_library_countries")
        .insert({ library_id: master.id, country });
      if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    }
    qc.invalidateQueries({ queryKey: ["sl-countries", master.id] });
  };

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        Select the countries this record applies to. Only the approved {ALLOWED_SERVICE_LIBRARY_COUNTRIES.length}-country allow-list is shown.
      </p>
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
        <div className="flex flex-wrap gap-2">
          {ALLOWED_SERVICE_LIBRARY_COUNTRIES.map((c) => (
            <button
              key={c}
              onClick={() => toggle(c)}
              className={`rounded-full border px-3 py-1 text-xs ${
                assigned.has(c)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistTab({ master, onChanged }: { master: Master; onChanged: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState(master.checklist_text ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadCountry, setUploadCountry] = useState<string>("");
  const [showHistory, setShowHistory] = useState<string | null>(null);

  const files = useQuery({
    queryKey: ["sl-cfiles", master.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_library_checklist_files").select("*")
        .eq("library_id", master.id)
        .order("file_name").order("version", { ascending: false });
      return (data ?? []) as unknown as ChecklistFile[];
    },
  });
  const assigned = useQuery({
    queryKey: ["sl-countries", master.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_library_countries").select("country").eq("library_id", master.id);
      return ((data ?? []) as { country: string }[]).map((r) => r.country);
    },
  });

  const grouped = useMemo(() => {
    const out: Record<string, ChecklistFile[]> = {};
    for (const f of files.data ?? []) {
      const key = `${f.country ?? "ALL"}::${f.file_name}`;
      (out[key] ??= []).push(f);
    }
    return out;
  }, [files.data]);

  const saveText = async () => {
    const { error } = await supabase.from("service_library").update({ checklist_text: text }).eq("id", master.id);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    onChanged();
  };

  const upload = async (file: File) => {
    setUploading(true);
    const country = uploadCountry || null;
    // determine version: max version for (library, country, file_name) + 1
    const matching = (files.data ?? []).filter(
      (f) => f.file_name === file.name && (f.country ?? null) === country,
    );
    const nextVersion = matching.length ? Math.max(...matching.map((m) => m.version)) + 1 : 1;
    const path = `checklist/${master.id}/${nextVersion}-${Date.now()}-${file.name}`;
    const up = await supabase.storage.from("service-library-files").upload(path, file);
    if (up.error) {
      setUploading(false);
      return toast({ title: "Upload failed", description: up.error.message, variant: "destructive" });
    }
    // flip previous to is_current=false
    if (matching.length) {
      await supabase.from("service_library_checklist_files")
        .update({ is_current: false })
        .in("id", matching.map((m) => m.id));
    }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("service_library_checklist_files").insert({
      library_id: master.id, country,
      file_name: file.name, file_path: path, mime_type: file.type, size_bytes: file.size,
      version: nextVersion, is_current: true, uploaded_by: u.user?.id ?? null,
    });
    setUploading(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Uploaded" });
    qc.invalidateQueries({ queryKey: ["sl-cfiles", master.id] });
  };

  const remove = async (f: ChecklistFile) => {
    if (!confirm(`Delete ${f.file_name} v${f.version}?`)) return;
    await supabase.storage.from("service-library-files").remove([f.file_path]);
    await supabase.from("service_library_checklist_files").delete().eq("id", f.id);
    qc.invalidateQueries({ queryKey: ["sl-cfiles", master.id] });
  };

  const download = async (f: ChecklistFile) => {
    const { data } = await supabase.storage.from("service-library-files").createSignedUrl(f.file_path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Checklist text (default)</Label>
        <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-2">
          <Button onClick={saveText}>Save checklist text</Button>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-medium">Checklist files</h3>
          <div className="flex items-center gap-2">
            <Select value={uploadCountry || "__all"} onValueChange={(v) => setUploadCountry(v === "__all" ? "" : v)}>
              <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Scope" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All countries</SelectItem>
                {(assigned.data ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50 cursor-pointer">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload
              <input type="file" hidden accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
              />
            </label>
          </div>
        </div>

        {files.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!files.isLoading && (files.data ?? []).length === 0 && (
          <div className="text-sm text-muted-foreground">No files yet.</div>
        )}
        <div className="space-y-2">
          {Object.entries(grouped).map(([key, versions]) => {
            const current = versions.find((v) => v.is_current) ?? versions[0];
            const history = versions.filter((v) => v.id !== current.id);
            return (
              <div key={key} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{current.file_name}</div>
                    <div className="text-xs text-muted-foreground">
                      v{current.version} · {current.country ?? "All countries"} · uploaded {new Date(current.uploaded_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => download(current)}><Download className="h-4 w-4" /></Button>
                    {history.length > 0 && (
                      <Button size="sm" variant="ghost" onClick={() => setShowHistory(showHistory === key ? null : key)}>
                        <History className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(current)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                {showHistory === key && history.length > 0 && (
                  <div className="mt-2 space-y-1 border-t pt-2">
                    {history.map((h) => (
                      <div key={h.id} className="flex items-center justify-between text-xs">
                        <span>v{h.version} · {new Date(h.uploaded_at).toLocaleDateString()}</span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => download(h)}><Download className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(h)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SubmissionTab({ master }: { master: Master }) {
  const qc = useQueryClient();
  const items = useQuery({
    queryKey: ["sl-sub", master.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_library_submission_checklist")
        .select("*").eq("library_id", master.id).order("sort_order");
      return (data ?? []) as unknown as SubmissionItem[];
    },
  });
  const assigned = useQuery({
    queryKey: ["sl-countries", master.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_library_countries").select("country").eq("library_id", master.id);
      return ((data ?? []) as { country: string }[]).map((r) => r.country);
    },
  });

  const update = async (id: string, patch: Partial<SubmissionItem>) => {
    await supabase.from("service_library_submission_checklist").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["sl-sub", master.id] });
  };
  const remove = async (id: string) => {
    if (!confirm("Remove this item?")) return;
    await supabase.from("service_library_submission_checklist").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["sl-sub", master.id] });
  };
  const add = async () => {
    const lbl = prompt("Item label");
    if (!lbl) return;
    const key = lbl.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") + "_" + Date.now();
    const nextOrder = ((items.data ?? []).reduce((m, x) => Math.max(m, x.sort_order), 0) || 0) + 1;
    await supabase.from("service_library_submission_checklist").insert({
      library_id: master.id, item_key: key, item_label: lbl, is_mandatory: true, sort_order: nextOrder,
    });
    qc.invalidateQueries({ queryKey: ["sl-sub", master.id] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Items counselors must check before submission.</p>
        <Button size="sm" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" />Add item</Button>
      </div>
      <div className="space-y-2">
        {(items.data ?? []).map((it) => (
          <div key={it.id} className="rounded-lg border p-3 grid gap-2 md:grid-cols-[1fr_180px_120px_120px_40px] md:items-center">
            <Input
              value={it.item_label}
              onChange={(e) => update(it.id, { item_label: e.target.value })}
              onBlur={(e) => update(it.id, { item_label: e.target.value })}
            />
            <Select value={it.country ?? "__all"} onValueChange={(v) => update(it.id, { country: v === "__all" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All countries</SelectItem>
                {(assigned.data ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={it.is_mandatory} onCheckedChange={(v) => update(it.id, { is_mandatory: v })} />
              Mandatory
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={it.is_active} onCheckedChange={(v) => update(it.id, { is_active: v })} />
              Active
            </label>
            <Button size="sm" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeesTab({ master }: { master: Master }) {
  const qc = useQueryClient();
  const items = useQuery({
    queryKey: ["sl-fees", master.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_library_fee_items")
        .select("*").eq("library_id", master.id).order("display_order");
      return (data ?? []) as unknown as FeeItem[];
    },
  });
  const assigned = useQuery({
    queryKey: ["sl-countries", master.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_library_countries").select("country").eq("library_id", master.id);
      return ((data ?? []) as { country: string }[]).map((r) => r.country);
    },
  });

  const update = async (id: string, patch: Partial<FeeItem>) => {
    await supabase.from("service_library_fee_items").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["sl-fees", master.id] });
  };
  const remove = async (id: string) => {
    await supabase.from("service_library_fee_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["sl-fees", master.id] });
  };
  const add = async () => {
    const nextOrder = ((items.data ?? []).reduce((m, x) => Math.max(m, x.display_order), 0) || 0) + 1;
    await supabase.from("service_library_fee_items").insert({
      library_id: master.id, fee_label: "New fee", amount: "0", currency: "INR", display_order: nextOrder,
    });
    qc.invalidateQueries({ queryKey: ["sl-fees", master.id] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Per-row country scope: leave as "All" or pick a specific country.</p>
        <Button size="sm" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" />Add fee</Button>
      </div>
      <div className="space-y-2">
        {(items.data ?? []).map((it) => (
          <div key={it.id} className="grid grid-cols-12 gap-2 rounded-lg border p-2">
            <Input className="col-span-4" defaultValue={it.fee_label} onBlur={(e) => update(it.id, { fee_label: e.target.value })} />
            <Input className="col-span-2" defaultValue={it.amount ?? ""} onBlur={(e) => update(it.id, { amount: e.target.value })} />
            <Input className="col-span-1" defaultValue={it.currency ?? ""} onBlur={(e) => update(it.id, { currency: e.target.value })} />
            <Input className="col-span-2" defaultValue={it.notes ?? ""} placeholder="Notes" onBlur={(e) => update(it.id, { notes: e.target.value })} />
            <Select value={it.country ?? "__all"} onValueChange={(v) => update(it.id, { country: v === "__all" ? null : v })}>
              <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All</SelectItem>
                {(assigned.data ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="col-span-1" onClick={() => remove(it.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CostSummaryTab({ master, onChanged }: { master: Master; onChanged: () => void }) {
  const [v, setV] = useState(master.cost_summary_html ?? "");
  const save = async () => {
    const { error } = await supabase.from("service_library").update({ cost_summary_html: v }).eq("id", master.id);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    onChanged();
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Complete cost breakdown shown on the counselor view. Supports basic HTML (paragraphs, lists, bold).
      </p>
      <Textarea rows={14} value={v} onChange={(e) => setV(e.target.value)} placeholder="Government fees, Future Link fees, third-party costs, notes, total estimated cost…" />
      <Button onClick={save}>Save Cost Summary</Button>
    </div>
  );
}

function ProcessFlowTab({ master, onChanged }: { master: Master; onChanged: () => void }) {
  const initial = Array.isArray(master.process_flow) ? (master.process_flow as string[]) : [];
  const [steps, setSteps] = useState<string[]>(initial);
  const save = async () => {
    const cleaned = steps.map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from("service_library").update({ process_flow: cleaned }).eq("id", master.id);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    onChanged();
  };
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-2">
          <Input value={s} onChange={(e) => { const c = [...steps]; c[i] = e.target.value; setSteps(c); }} />
          <Button variant="ghost" size="sm" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setSteps([...steps, ""])}>
          <Plus className="h-4 w-4 mr-1" /> Add step
        </Button>
        <Button size="sm" onClick={save}>Save</Button>
      </div>
    </div>
  );
}

function InternalSopTab({ master, onChanged }: { master: Master; onChanged: () => void }) {
  const qc = useQueryClient();
  const [html, setHtml] = useState(master.internal_sop_html ?? "");
  const tasks = useQuery({
    queryKey: ["sl-sop", master.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_library_sop_tasks")
        .select("*").eq("library_id", master.id).order("sort_order");
      return (data ?? []) as unknown as SopTask[];
    },
  });

  const saveHtml = async () => {
    const { error } = await supabase.from("service_library").update({ internal_sop_html: html }).eq("id", master.id);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    onChanged();
  };
  const addTask = async () => {
    const t = prompt("Task text");
    if (!t) return;
    const order = ((tasks.data ?? []).reduce((m, x) => Math.max(m, x.sort_order), 0) || 0) + 1;
    await supabase.from("service_library_sop_tasks").insert({ library_id: master.id, task_text: t, sort_order: order });
    qc.invalidateQueries({ queryKey: ["sl-sop", master.id] });
  };
  const update = async (id: string, patch: Partial<SopTask>) => {
    await supabase.from("service_library_sop_tasks").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["sl-sop", master.id] });
  };
  const remove = async (id: string) => {
    await supabase.from("service_library_sop_tasks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["sl-sop", master.id] });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Internal SOP (counselor-only)</Label>
        <Textarea rows={10} value={html} onChange={(e) => setHtml(e.target.value)} />
        <div className="mt-2"><Button onClick={saveHtml}>Save SOP</Button></div>
      </div>
      <div className="rounded-2xl border p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium">SOP tasks (counselors check off per lead)</h3>
          <Button size="sm" onClick={addTask}><Plus className="h-3.5 w-3.5 mr-1" />Add task</Button>
        </div>
        <div className="space-y-2">
          {(tasks.data ?? []).map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <Input defaultValue={t.task_text} onBlur={(e) => update(t.id, { task_text: e.target.value })} />
              <Switch checked={t.is_active} onCheckedChange={(v) => update(t.id, { is_active: v })} />
              <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OverridesTab({ master }: { master: Master }) {
  const qc = useQueryClient();
  const [openCountry, setOpenCountry] = useState<string | null>(null);

  const assigned = useQuery({
    queryKey: ["sl-countries", master.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_library_countries").select("country").eq("library_id", master.id);
      return ((data ?? []) as { country: string }[]).map((r) => r.country);
    },
  });
  const overrides = useQuery({
    queryKey: ["sl-overrides", master.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_library_overrides").select("*").eq("library_id", master.id);
      return (data ?? []) as unknown as Override[];
    },
  });

  const byCountry = useMemo(() => {
    const m: Record<string, Override> = {};
    for (const o of overrides.data ?? []) m[o.country] = o;
    return m;
  }, [overrides.data]);

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Override any text field for a specific country. Leave blank to inherit from the master.
      </p>
      {(assigned.data ?? []).length === 0 && (
        <div className="text-sm text-muted-foreground">Assign countries first in the Countries tab.</div>
      )}
      {(assigned.data ?? []).map((c) => (
        <div key={c} className="rounded-lg border">
          <button
            className="flex w-full items-center justify-between p-3 text-left"
            onClick={() => setOpenCountry(openCountry === c ? null : c)}
          >
            <span className="font-medium">{c}</span>
            <div className="flex items-center gap-2">
              {byCountry[c] && <Badge variant="secondary">Override active</Badge>}
              {openCountry === c ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </button>
          {openCountry === c && (
            <OverrideForm
              libraryId={master.id}
              country={c}
              existing={byCountry[c] ?? null}
              onSaved={() => qc.invalidateQueries({ queryKey: ["sl-overrides", master.id] })}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function OverrideForm({
  libraryId, country, existing, onSaved,
}: { libraryId: string; country: string; existing: Override | null; onSaved: () => void }) {
  const [v, setV] = useState({
    quick_guide_what_to_do: existing?.quick_guide_what_to_do ?? "",
    quick_guide_common_mistakes: existing?.quick_guide_common_mistakes ?? "",
    quick_guide_escalation_rules: existing?.quick_guide_escalation_rules ?? "",
    quick_guide_important_reminders: existing?.quick_guide_important_reminders ?? "",
    checklist_text: existing?.checklist_text ?? "",
    cost_summary_html: existing?.cost_summary_html ?? "",
    internal_sop_html: existing?.internal_sop_html ?? "",
    process_flow_text: Array.isArray(existing?.process_flow)
      ? (existing!.process_flow as string[]).join("\n") : "",
  });

  const save = async () => {
    const payload = {
      library_id: libraryId,
      country,
      quick_guide_what_to_do: v.quick_guide_what_to_do || null,
      quick_guide_common_mistakes: v.quick_guide_common_mistakes || null,
      quick_guide_escalation_rules: v.quick_guide_escalation_rules || null,
      quick_guide_important_reminders: v.quick_guide_important_reminders || null,
      checklist_text: v.checklist_text || null,
      cost_summary_html: v.cost_summary_html || null,
      internal_sop_html: v.internal_sop_html || null,
      process_flow: v.process_flow_text
        ? v.process_flow_text.split("\n").map((s) => s.trim()).filter(Boolean)
        : null,
    };
    const { error } = await supabase
      .from("service_library_overrides")
      .upsert(payload, { onConflict: "library_id,country" });
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    onSaved();
  };
  const clear = async () => {
    if (!existing) return;
    if (!confirm(`Remove override for ${country}?`)) return;
    await supabase.from("service_library_overrides").delete().eq("id", existing.id);
    onSaved();
  };

  return (
    <div className="space-y-3 border-t p-4 bg-slate-50">
      {[
        ["quick_guide_what_to_do", "Quick Guide · What to do"],
        ["quick_guide_common_mistakes", "Quick Guide · Common mistakes"],
        ["quick_guide_escalation_rules", "Quick Guide · Escalation rules"],
        ["quick_guide_important_reminders", "Quick Guide · Important reminders"],
        ["checklist_text", "Checklist text"],
        ["cost_summary_html", "Cost Summary"],
        ["internal_sop_html", "Internal SOP"],
        ["process_flow_text", "Process Flow (one step per line)"],
      ].map(([k, label]) => (
        <div key={k}>
          <Label className="text-xs">{label}</Label>
          <Textarea rows={3}
            value={(v as Record<string, string>)[k]}
            onChange={(e) => setV({ ...v, [k]: e.target.value })}
          />
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" onClick={save}>Save override</Button>
        {existing && <Button size="sm" variant="ghost" onClick={clear}>Remove override</Button>}
      </div>
    </div>
  );
}